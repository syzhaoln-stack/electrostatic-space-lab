import { THREE } from './scene.js';
import { fieldAt } from './physics.js';

// The slice is sampled from the same field used by the particle integrator.
// Colour has a fixed linear scale; only the in-plane vector is projected.
export const FIELD_SCALE = 1000;
const stops = [[8,20,34],[12,42,60],[17,71,89],[28,119,132]];
export function fieldColour(magnitude) {
 const u = Math.max(0,Math.min(1,magnitude / FIELD_SCALE)) * (stops.length - 1);
 const i = Math.min(stops.length - 2,Math.floor(u)),f = u - i;
 return stops[i].map((v,k)=>Math.round(v+(stops[i+1][k]-v)*f));
}

export function renderParticleField(scene,sources,mode,offset=0) {
 scene.clearLayer('field-slice');
 if(mode==='off')return ()=>{};
 if(mode==='space'){
  for(let x=-5.5;x<=5.5;x+=2.2)for(let y=-2.6;y<=2.6;y+=2.6)for(let z=-2.6;z<=2.6;z+=2.6){
   const p=[x,y,z],E=fieldAt(p,sources).E,m=Math.hypot(...E);
   if(m<.01)continue;
   scene.arrow(p,E,'#6bc4e2',.55,'field-slice');
  }
  return ()=>{};
 }
 const width=12.8,height=7.2,nx=192,ny=108;
 const point=(x,y,lift=0)=>mode==='xy'?[x,y,offset+lift]:[x,offset+lift,y];
 const canvas=document.createElement('canvas');canvas.width=nx;canvas.height=ny;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(nx,ny);
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const pos=point((x/(nx-1)-.5)*width,(.5-y/(ny-1))*height),E=fieldAt(pos,sources).E;
  const rgb=fieldColour(Math.hypot(...E)),i=(y*nx+x)*4;
  const edge=Math.min(x,y,nx-1-x,ny-1-y)/9,fade=Math.max(0,Math.min(1,edge));
  pixels.data.set([...rgb,Math.round(255*fade*fade*(3-2*fade))],i);
 }
 ctx.putImageData(pixels,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false,toneMapped:false}));
 if(mode==='xz')mesh.rotation.x=Math.PI/2;
 mesh.position.set(...point(0,0));mesh.renderOrder=-2;scene.layer('field-slice').add(mesh);
 scene.line([point(-width/2,-height/2),point(width/2,-height/2),point(width/2,height/2),point(-width/2,height/2),point(-width/2,-height/2)],'#478ba5','field-slice',.16);
 // Short integral curves form a continuous direction texture. Markers move
 // along E, not along a particle solution; their speed is purely illustrative.
 const paths=[],fixed=[];
 function branch(seed,sign){const points=[],p=[...seed];for(let k=0;k<25;k++){
  const E=fieldAt(point(...p),sources).E,v=[E[0],E[mode==='xy'?1:2]],m=Math.hypot(...v);
  if(m<.01||Math.abs(p[0])>width/2||Math.abs(p[1])>height/2||sources.some(s=>Math.hypot(...s.pos.map((q,j)=>q-point(...p)[j]))<.27))break;
  // Midpoint integration keeps the texture tangential even near a source.
  const h=.065*sign,mid=[p[0]+h*v[0]/m/2,p[1]+h*v[1]/m/2],me=fieldAt(point(...mid),sources).E,mv=[me[0],me[mode==='xy'?1:2]],mm=Math.hypot(...mv);
  if(mm<.01)break;p[0]+=h*mv[0]/mm;p[1]+=h*mv[1]/mm;points.push(point(...p,.036));
 }return points;}
 const compact=scene.container.clientWidth<600,columns=compact?23:29,rows=compact?13:17;
 for(let ix=0;ix<columns;ix++)for(let iy=0;iy<rows;iy++){
  const x=-6.2+ix*(12.4/(columns-1)),y=-3.3+iy*(6.6/(rows-1)),seed=[x,y];
  const path=[...branch(seed,-1).reverse(),point(...seed,.036),...branch(seed,1)];
  if(path.length<8)continue;paths.push(path);
  for(let j=1;j<path.length;j++)fixed.push(...path[j-1],...path[j]);
 }
 const fixedGeo=new THREE.BufferGeometry();fixedGeo.setAttribute('position',new THREE.Float32BufferAttribute(fixed,3));
 const fixedLines=new THREE.LineSegments(fixedGeo,new THREE.LineBasicMaterial({color:'#4aaeca',transparent:true,opacity:.13,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));scene.layer('field-slice').add(fixedLines);
 const movingPositions=new Float32Array(paths.length*6*2*3),movingColours=new Float32Array(paths.length*6*2*3),movingGeo=new THREE.BufferGeometry();movingGeo.setAttribute('position',new THREE.BufferAttribute(movingPositions,3));movingGeo.setAttribute('color',new THREE.BufferAttribute(movingColours,3));
 const movingLines=new THREE.LineSegments(movingGeo,new THREE.LineBasicMaterial({color:'#8ae8ff',vertexColors:true,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));movingLines.frustumCulled=false;scene.layer('field-slice').add(movingLines);
 for(let x=-5.7;x<=5.71;x+=1.9)for(let y=-2.7;y<=2.71;y+=2.7){
  const pos=point(x,y,.025);
  if(sources.some(s=>Math.hypot(...s.pos.map((v,k)=>v-pos[k]))<.5))continue;
  const E=fieldAt(point(x,y),sources).E,m=Math.hypot(...E),normal=E[mode==='xy'?2:1],projected=mode==='xy'?[E[0],E[1],0]:[E[0],0,E[2]];
  if(m<.01)continue;
  if(Math.hypot(...projected)>.035*m)scene.arrow(pos,projected,'#5c9db3',.3,'field-slice');
  if(Math.abs(normal)>.3*m){
   // Circle + dot / cross denotes the positive / negative coordinate normal.
   const ring=new THREE.Mesh(new THREE.RingGeometry(.055,.073,20),new THREE.MeshBasicMaterial({color:'#7fb5cb',side:THREE.DoubleSide}));
   if(mode==='xz')ring.rotation.x=Math.PI/2;
   ring.position.set(...point(x-.17,y,.03));scene.layer('field-slice').add(ring);
   if(normal>0){const dot=new THREE.Mesh(new THREE.SphereGeometry(.026,8,6),new THREE.MeshBasicMaterial({color:'#7fb5cb'}));dot.position.copy(ring.position);scene.layer('field-slice').add(dot);}
   else for(const sign of [-1,1])scene.line([point(x-.205,y-.035*sign,.035),point(x-.135,y+.035*sign,.035)],'#7fb5cb','field-slice');
  }
 }
 const animate=t=>{let cursor=0;for(let i=0;i<paths.length;i++){
  const path=paths[i],cycle=(t*.000105+i*.61803398875)%1,phase=cycle*(path.length-7),fade=Math.sin(Math.PI*cycle)**.7;
  for(let j=0;j<6;j++){const f=phase+j,k=Math.floor(f),u=f-k;
   for(let n=0;n<3;n++)movingPositions[cursor++]=path[k][n]+(path[k+1][n]-path[k][n])*u;
   for(let n=0;n<3;n++)movingPositions[cursor++]=path[k+1][n]+(path[k+2][n]-path[k+1][n])*u;
   const brightness=(.18+.82*j/5)*fade;for(let n=cursor-6;n<cursor;n++)movingColours[n]=brightness;
  }
 }movingGeo.attributes.position.needsUpdate=true;movingGeo.attributes.color.needsUpdate=true;};
 animate(0);return animate;
}
