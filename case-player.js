import {mountCaseScene as mountReferenceScene} from './case-scene.js';

// Blender assets and the Godot simulation are the default for the three
// investigated industrial incidents. Other engineering examples keep their
// existing lightweight teaching scene.
export function mountCaseScene(host,{caseId='desmoines',state={},onInspect}={}){
 if(!['desmoines','valley','glenpool'].includes(caseId))return mountReferenceScene(host,{caseId,state,onInspect});
 let current={...state},disposed=false,ready=false;
 const frame=document.createElement('iframe');frame.title='事故装置与过程 · 可旋转的三维教学推演';frame.src=new URL('./assets/godot/index.html?case='+encodeURIComponent(caseId),import.meta.url).href;frame.allow='fullscreen';frame.style.cssText='display:block;width:100%;height:100%;border:0;background:#07101b';
 const loading=document.createElement('div');loading.className='case-loading';loading.innerHTML='<strong>正在载入三维装置</strong><span>首次载入需要下载模型与播放器，完成后可旋转查看。</span><button type="button">重新载入</button>';
 host.style.position='relative';host.append(frame,loading);
 function send(){if(ready&&!disposed)frame.contentWindow?.postMessage({type:'electrostatic-case',caseId,...current},location.origin);}
 function receive(event){if(event.source!==frame.contentWindow||event.origin!==location.origin)return;let data=event.data;try{if(typeof data==='string')data=JSON.parse(data);}catch{return;}
  if(data?.type==='case-ready'){ready=true;loading.hidden=true;host.dataset.engine='godot';send();}
  if(data?.type==='case-error'||data?.type==='case-load-error'){loading.hidden=false;loading.querySelector('strong').textContent='三维播放器暂未载入';loading.querySelector('span').textContent='请使用支持 WebGL 2 的现代浏览器，或重新载入。';}
 }
 loading.querySelector('button').onclick=()=>{ready=false;loading.hidden=false;frame.src=frame.src;};
 frame.addEventListener('load',()=>{if(!disposed)loading.hidden=true;});
 window.addEventListener('message',receive);
 return {update(next){current={...current,...next};send();},dispose(){disposed=true;window.removeEventListener('message',receive);frame.remove();loading.remove();}};
}
