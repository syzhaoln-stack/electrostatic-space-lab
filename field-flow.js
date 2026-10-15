import {fieldAt} from './physics.js';
const norm=v=>Math.hypot(...v);
const dist=(a,b)=>norm(a.map((v,i)=>v-b[i]));
// Integral curves of E. Their animated marks are direction cues, not particles.
export function traceFieldLines(sources,{slice=false}={}){
 const lines=[];
 for(const source of sources){
  if(Math.abs(source.Q)<1e-6)continue;
  const sign=Math.sign(source.Q),directions=[];
  if(slice){for(let i=0;i<32;i++){const a=(i+.5)/32*Math.PI*2;directions.push([Math.cos(a),Math.sin(a),0]);}}
  else for(let j=0;j<9;j++)for(let k=0;k<8;k++){const a=Math.PI*(j+.5)/9,p=k*Math.PI/4+(j%2)*Math.PI/8;directions.push([Math.cos(a),Math.sin(a)*Math.cos(p),Math.sin(a)*Math.sin(p)]);}
  for(const d of directions){
   let p=source.pos.map((v,i)=>v+d[i]*((source.radius||.22)+.025)),points=[p],hit=null;
   for(let step=0;step<320;step++){
    const e=fieldAt(p,sources).E,m=norm(e);if(m<.03)break;
    const mid=p.map((v,i)=>v+sign*e[i]/m*.035),em=fieldAt(mid,sources).E,mm=norm(em);if(mm<.03)break;
    const next=p.map((v,i)=>v+sign*em[i]/mm*.07);
    hit=sources.find(s=>s!==source&&dist(next,s.pos)<(s.radius||.22)+.025);
    if(hit)break;p=next;points.push(p);if(Math.abs(p[0])>6.6||Math.abs(p[1])>4.5||Math.abs(p[2])>4.5)break;
   }
   if(sign<0&&hit?.Q>0)continue;
   if(sign<0)points.reverse();if(points.length>3)lines.push(points);
  }
 }
 return lines;
}
export function buildFieldFlow(scene,THREE,sources,{slice=false}={}){
 scene.clearLayer('field-flow');const lines=traceFieldLines(sources,{slice}),marks=[];
 for(const [j,points] of lines.entries()){
  scene.line(points,'#55b5df','field-flow',slice?.33:.40);
  for(const f of [.32,.72]){const i=Math.floor((points.length-2)*f);scene.arrow(points[i],points[i+1].map((v,k)=>v-points[i][k]),'#7bd5e6',.16,'field-flow');}
  for(let k=0;k<2;k++)marks.push({points,phase:(j*.29+k*.5)%1});
 }
 const positions=new Float32Array(marks.length*3),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const dot=new THREE.Points(geo,new THREE.PointsMaterial({color:'#a1eaf3',size:.065,transparent:true,opacity:.9,depthWrite:false}));scene.layer('field-flow').add(dot);
 return {update(t){marks.forEach((m,j)=>{const f=(t*.014+m.phase*m.points.length)%Math.max(1,m.points.length-1),i=Math.floor(f),u=f-i,a=m.points[i],b=m.points[i+1]||a;for(let k=0;k<3;k++)positions[j*3+k]=a[k]+u*(b[k]-a[k]);});geo.attributes.position.needsUpdate=true;},count:lines.length};
}
export function createFieldTexture(THREE,getSources){
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=640;const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 let seed=157,bits=[];const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const fresh=()=>({x:(rand()-.5)*12,y:(rand()-.5)*8,age:rand()*100});
 function clear(){ctx.fillStyle='#07111d';ctx.fillRect(0,0,960,640);bits=Array.from({length:1250},fresh);for(let i=0;i<16;i++)tick(1/30);texture.needsUpdate=true;}
 function tick(dt){
  const src=getSources();ctx.fillStyle='rgba(7,17,29,.085)';ctx.fillRect(0,0,960,640);ctx.lineWidth=1.05;ctx.strokeStyle='rgba(90,204,230,.65)';ctx.beginPath();
  for(let i=0;i<bits.length;i++){let b=bits[i];const e=fieldAt([b.x,b.y,0],src).E,m=Math.hypot(e[0],e[1]);if(b.age++>120||m<.02||Math.abs(b.x)>6||Math.abs(b.y)>4||src.some(s=>Math.hypot(b.x-s.pos[0],b.y-s.pos[1],s.pos[2])<.29)){bits[i]=fresh();continue;}const nx=b.x+e[0]/m*dt*1.05,ny=b.y+e[1]/m*dt*1.05;ctx.moveTo((b.x+6)*80,(4-b.y)*80);ctx.lineTo((nx+6)*80,(4-ny)*80);b.x=nx;b.y=ny;}
  ctx.stroke();texture.needsUpdate=true;
 }
 clear();return {texture,update:tick,clear,dispose:()=>texture.dispose()};
}
