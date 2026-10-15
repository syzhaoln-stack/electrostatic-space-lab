export function mountCharge(container){
 container.innerHTML=`<div class="charge-tabs" role="group" aria-label="选择实验"><button data-charge-tab="spark">充电与火花</button><button data-charge-tab="propagation">振荡与传播</button></div><div id="charge-experiment"></div>`;
 const style=document.createElement('style');style.textContent='.charge-tabs{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:18px}.charge-tabs button{font-size:13px;padding:12px 17px}#charge-experiment{min-width:0}';document.head.append(style);
 let dispose=null,epoch=0,closed=false;
 async function select(key){const current=++epoch;dispose?.();dispose=null;container.querySelectorAll('[data-charge-tab]').forEach(b=>b.classList.toggle('active',b.dataset.chargeTab===key));const host=container.querySelector('#charge-experiment');delete host.dataset.ready;host.innerHTML='<p class="status">正在准备这个实验…</p>';try{const module=await import(key==='spark'?'./spark-page.js':'./propagation-page.js');if(closed||current!==epoch)return;dispose=(key==='spark'?module.mountSpark:module.mountPropagation)(host);history.replaceState(null,'',location.pathname+'#'+key);compactExperiment(host,key);host.dataset.ready=key;}catch(e){console.error(e);host.innerHTML='<p class="status">实验暂未载入，请刷新后重试。</p>';host.dataset.ready='error';}}
 container.querySelectorAll('[data-charge-tab]').forEach(b=>b.onclick=()=>select(b.dataset.chargeTab));select(location.hash==='#propagation'?'propagation':'spark');return()=>{closed=true;epoch++;dispose?.();style.remove();};
}

function compactExperiment(host,key){
 const details=host.querySelector(key==='spark'?'.spark-panel>.spark-details':'.prop-model');
 if(!details)return;
 details.querySelector('summary').textContent='说明';
 if(key==='spark'){
  for(const selector of ['.spark-panel>.eyebrow','.spark-panel>h2','.spark-panel>p','.spark-reset-note','.spark-formula-row','.spark-evidence','.spark-field-meter>p','.spark-field-meter>small']){
   const node=host.querySelector(selector);if(node)details.append(node);
  }
  host.querySelector('.spark-lab').append(details);
 }else{
  for(const selector of ['.prop-model-intro','.prop-lesson','.prop-stage-caption>strong','.prop-stage-bottom']){const node=host.querySelector(selector);if(node)details.append(node);}
  const toggle=host.querySelector('#prop-params-toggle');toggle.textContent='参数';toggle.addEventListener('click',()=>{toggle.textContent=toggle.getAttribute('aria-expanded')==='true'?'收起参数':'参数';});
  host.querySelector('.propagation-lab').append(details);
 }
}
