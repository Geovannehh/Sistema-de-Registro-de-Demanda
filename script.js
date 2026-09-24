let db=null, demandas=[], almox=[];
const STATUS_LABEL={EM_ANALISE:'Em análise',RESOLVIDO:'Resolvido',PENDENTE:'Pendente',EMPRESTIMO:'Empréstimo',CANCELADO:'Cancelado'};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const todayStr=()=>new Date().toISOString().slice(0,10);

document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  document.getElementById('view-'+t.dataset.view).classList.add('active');
});
document.getElementById('themeBtn').onclick=()=>{
  const cur=document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', cur==='dark'?'light':'dark');
};
document.getElementById('d_data').value=todayStr();
document.getElementById('a_data').value=todayStr();

async function initDb(){
  try{
    db = await claude.use('db');
  }catch(e){ db=null; }
  if(db){
    db.collection('demandas').onSnapshot(docs=>{ demandas=docs.map(d=>({id:d.id,...d.data})).sort((a,b)=>(b.criadoEm||0)-(a.criadoEm||0)); render(); });
    db.collection('almoxarifado').onSnapshot(docs=>{ almox=docs.map(d=>({id:d.id,...d.data})).sort((a,b)=>(b.criadoEm||0)-(a.criadoEm||0)); render(); });
  } else {
    render();
  }
}

document.getElementById('addDemanda').onclick=async()=>{
  const colab=document.getElementById('d_colab').value.trim();
  const prob=document.getElementById('d_prob').value.trim();
  if(!colab||!prob){alert('Preencha ao menos Colaborador e Problema.');return;}
  const item={
    colaborador:colab, matricula:document.getElementById('d_mat').value.trim(),
    setor:document.getElementById('d_setor').value.trim(), maquina:document.getElementById('d_maq').value.trim(),
    tombo:document.getElementById('d_tombo').value.trim(), data:document.getElementById('d_data').value||todayStr(),
    hora:document.getElementById('d_hora').value, status:document.getElementById('d_status').value,
    problema:prob, solucao:document.getElementById('d_sol').value.trim(), criadoEm:Date.now()
  };
  if(db){ try{ await db.collection('demandas').doc(uid()).set(item); }catch(e){ demandas.unshift({id:uid(),...item}); render(); } }
  else { demandas.unshift({id:uid(),...item}); render(); }
  ['d_colab','d_mat','d_setor','d_maq','d_tombo','d_hora','d_prob','d_sol'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('d_status').value='EM_ANALISE';
};

document.getElementById('addAlmox').onclick=async()=>{
  const it=document.getElementById('a_item').value.trim();
  if(!it){alert('Informe o item.');return;}
  const item={
    item:it, quantidade:Number(document.getElementById('a_qtd').value)||1, tipo:document.getElementById('a_tipo').value,
    setor:document.getElementById('a_setor').value.trim(), responsavel:document.getElementById('a_resp').value.trim(),
    data:document.getElementById('a_data').value||todayStr(), obs:document.getElementById('a_obs').value.trim(), criadoEm:Date.now()
  };
  if(db){ try{ await db.collection('almoxarifado').doc(uid()).set(item); }catch(e){ almox.unshift({id:uid(),...item}); render(); } }
  else { almox.unshift({id:uid(),...item}); render(); }
  ['a_item','a_setor','a_resp','a_obs'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('a_qtd').value=1;
};

async function setStatus(id,status){
  const d=demandas.find(x=>x.id===id); if(!d) return;
  d.status=status;
  if(db){ try{ await db.collection('demandas').doc(id).update({status}); }catch(e){} }
  render();
}

document.getElementById('buscaD').oninput=render;
document.getElementById('filtroStatus').onchange=render;
document.getElementById('buscaA').oninput=render;

function pillHtml(s){ return `<span class="pill ${s}">${STATUS_LABEL[s]||s}</span>`; }

function render(){
  const total=demandas.length;
  const counts={}; demandas.forEach(d=>counts[d.status]=(counts[d.status]||0)+1);
  document.getElementById('statsBox').innerHTML = `
    <div class="stat"><b>${total}</b><span>Total de demandas</span></div>
    <div class="stat"><b style="color:var(--ok)">${counts.RESOLVIDO||0}</b><span>Resolvidas</span></div>
    <div class="stat"><b style="color:var(--warn)">${counts.EM_ANALISE||0}</b><span>Em análise</span></div>
    <div class="stat"><b style="color:var(--info)">${counts.EMPRESTIMO||0}</b><span>Empréstimo</span></div>
    <div class="stat"><b>${almox.length}</b><span>Mov. de almoxarifado</span></div>`;

  document.getElementById('recentList').innerHTML = demandas.slice(0,5).map(cardDemanda).join('') || '<div class="empty">Nenhuma demanda registrada ainda.</div>';

  const busca=(document.getElementById('buscaD').value||'').toLowerCase();
  const fStatus=document.getElementById('filtroStatus').value;
  const filtered=demandas.filter(d=>{
    const okS = !fStatus || d.status===fStatus;
    const hay=[d.colaborador,d.setor,d.maquina,d.tombo,d.problema].join(' ').toLowerCase();
    return okS && hay.includes(busca);
  });
  document.getElementById('demandasList').innerHTML = filtered.map(cardDemanda).join('') || '<div class="empty">Nenhuma demanda encontrada.</div>';

  const buscaA=(document.getElementById('buscaA').value||'').toLowerCase();
  const filteredA=almox.filter(a=>[a.item,a.setor,a.responsavel].join(' ').toLowerCase().includes(buscaA));
  document.getElementById('almoxList').innerHTML = filteredA.map(cardAlmox).join('') || '<div class="empty">Nenhuma movimentação registrada.</div>';
}

function cardDemanda(d){
  return `<div class="item">
    <div class="item-top">
      <div><b>${d.colaborador||'—'}</b><div class="meta">${d.setor||'—'} · ${d.maquina||'—'}${d.tombo?(' · Tombo '+d.tombo):''} · ${d.data||''} ${d.hora||''}</div></div>
      ${pillHtml(d.status)}
    </div>
    <div class="problema"><b>Problema:</b> ${d.problema||'—'}</div>
    ${d.solucao?`<div class="problema"><b>Solução:</b> ${d.solucao}</div>`:''}
    <div class="tag-row">
      ${Object.keys(STATUS_LABEL).map(s=>`<button class="tag" style="cursor:pointer;border:none" onclick="setStatus('${d.id}','${s}')">${STATUS_LABEL[s]}</button>`).join('')}
    </div>
  </div>`;
}
function cardAlmox(a){
  return `<div class="item">
    <div class="item-top">
      <div><b>${a.item}</b><div class="meta">${a.setor||'—'} · Resp: ${a.responsavel||'—'} · ${a.data||''}</div></div>
      <span class="pill ${a.tipo==='ENTRADA'?'RESOLVIDO':'EMPRESTIMO'}">${a.tipo==='ENTRADA'?'+ ':'- '}${a.quantidade} un.</span>
    </div>
    ${a.obs?`<div class="problema">${a.obs}</div>`:''}
  </div>`;
}

initDb();
