import {FieldScene,THREE} from './scene.js';

// Qualitative mechanisms linked to investigation evidence; dimensions are not reconstructions.
export function mountCaseScene(host,{caseId='desmoines',state={},onInspect}={}){
 const view=new FieldScene(host,{extent:6}),compact=host.clientWidth<500;view.camera.position.set(...(compact?[11,7,14]:[8,5,10]));view.controls.target.set(0,-.7,0);
 host.style.position='relative';const notes=document.createElement('div');notes.style.cssText='position:absolute;top:12px;left:12px;right:12px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;pointer-events:none;z-index:2';host.append(notes);
 let current={step:0,bonded:false,grounded:true,liquid:'diesel',fieldOn:true,chargeOn:true,vaporVisible:true,...state};
 let dust=[];
 const group=()=>view.layer('case');
 const material=(color,opacity=1,metalness=.1)=>new THREE.MeshStandardMaterial({color,roughness:.48,metalness,transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity===1});
 function box(size,pos,color,opacity=1){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color,opacity,.3));m.position.set(...pos);m.castShadow=true;group().add(m);return m}
 function sphere(r,pos,color,opacity=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,28,20),material(color,opacity));m.position.set(...pos);group().add(m);return m}
 function cylinder(r,h,pos,color,opacity=1){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,56),material(color,opacity,.45));m.position.set(...pos);m.castShadow=true;group().add(m);return m}
 function tube(points,color,r=.035){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,48,r,8,false),material(color));group().add(m);return m}
 function label(text,p,color='#173447',size=.48){
  if(text.length>15){const note=document.createElement('div');note.textContent=text;note.style.cssText=`max-width:100%;font:12px/1.7 'Microsoft YaHei',sans-serif;color:${color};background:#fffffff2;border:1px solid #d4e1e5;border-radius:6px;padding:5px 9px`;notes.append(note);return null;}
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='600 40px "Microsoft YaHei",sans-serif';canvas.width=Math.max(128,Math.ceil(ctx.measureText(text).width+32));canvas.height=80;ctx.font='600 40px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffffffe8';ctx.fillRect(0,5,canvas.width,70);ctx.fillStyle=color;ctx.fillText(text,canvas.width/2,40);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,fog:false,toneMapped:false});const sprite=new THREE.Sprite(material);sprite.position.set(...p);const scale=compact?1.8:1.5;sprite.scale.set(size*scale*canvas.width/80,size*scale,1);sprite.renderOrder=10;view.layer('case-labels').add(sprite);return sprite;
 }
 function arrow(p,v,c,l=.8){return view.arrow(p,v,c,l,'case-vectors')}
 function spark(pos){const coords=[[0,.28,0],[-.15,.06,0],[.1,.08,0],[-.1,-.17,0],[.12,-.1,0]].map(p=>p.map((v,i)=>v+pos[i]));tube(coords,'#eab63e',.035);sphere(.22,pos,'#f5bd48',.16);label('可能放电处（示意）',[pos[0]+.5,pos[1]+.5,pos[2]],'#9b6717',.42)}
 function earth(x,z,connected=true,caption){const color=connected?'#087e8b':'#6f818c';tube([[x,-2.6,z],[x,-3.65,z]],color,.025);for(let i=0;i<3;i++)tube([[x-.33+i*.08,-3.65-i*.12,z],[x+.33-i*.08,-3.65-i*.12,z]],color,.022);label(caption||(connected?'外壳接地路径':'接地路径未连通'),[x,-2.9,z+.5],color,.4)}
 function chargeMarks(inside=false){for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const pos=[Math.cos(a)*(inside?.9:1.55),(inside?-2.35:-.7)+Math.sin(a*2)*.35,Math.sin(a)*(inside?.9:1.55)];label('+',pos,'#99621e',.28)}}
 function tank(){
  const portable=caseId==='desmoines',r=portable?1.3:1.75,h=portable?2.5:3.6,cy=-1.7;
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,64,1,true,Math.PI*.1,Math.PI*1.4),material('#9aafba',.5,.6));shell.position.set(0,cy,0);group().add(shell);
  cylinder(r,.12,[0,cy-h/2,0],'#91a6b2');const rim=new THREE.Mesh(new THREE.TorusGeometry(r,.06,10,64),material('#72909f'));rim.rotation.x=Math.PI/2;rim.position.set(0,cy+h/2,0);group().add(rim);
  const fluidH=caseId==='glenpool'?(current.step===1?.12:current.step>=2?1.25:1.65):(portable?1.2:1.65),fluidTop=cy-h/2+fluidH+.1;cylinder(r*.96,fluidH,[0,cy-h/2+fluidH/2+.1,0],caseId==='glenpool'?'#bf9856':'#8bbcc5',.55);
  label(portable?'便携金属容器':'金属储罐',[-2.6,-1.4,0]);label(caseId==='glenpool'?(current.step===0?'先前的汽油':current.step===1?'移出后仍有残留':'新灌入的柴油'):'输送中的液体',[0,-2.4,1.8],'#356a7b');
  const nozzle=portable?[-.5,.4,0]:[-1.2,.6,0];
  if(caseId!=='glenpool'){tube([[-4,-2,-.5],[-3,-1,-.5],[-2,1,-.5],nozzle],'#536b7c',.1);cylinder(.1,.55,[nozzle[0],nozzle[1]-.25,nozzle[2]],'#bdd0d8');label('输送管 / 喷嘴',[-2.7,1.4,-.5]);
   if(current.step>=1){for(let i=0;i<4;i++)sphere(.06,[nozzle[0],nozzle[1]-.4-i*.23,nozzle[2]],'#58a8bc',.8);arrow([nozzle[0],nozzle[1]-.5,nozzle[2]],[0,-1,0],'#4b9caf',.7);if(caseId==='valley')chargeMarks(true);else if(!current.bonded)for(let i=0;i<3;i++)label('+',[nozzle[0]-.35+i*.3,nozzle[1]+.2,.1],'#99621e',.28);else if(!current.grounded)chargeMarks();}
  }
  tube([[r-.1,-1.9,0],[2.3,-2.1,0],[2.7,-2.6,0]],current.grounded?'#087e8b':'#b3bec4',.035);earth(2.7,0,current.grounded);
  if(caseId==='desmoines'){
   if(current.bonded)tube([nozzle,[.6,.8,.1],[1.55,-.5,.1],[r,-1.9,0]],'#087e8b',.035);else view.dashedLine([nozzle,[r,-1.9,0]],'#9caeb7','case-vectors',.6);
   label(current.bonded?'喷嘴与容器已连通':'检查喷嘴—容器的电荷路径',[.4,1.3,0],current.bonded?'#087e8b':'#8f6b38');
   if(current.step>=2&&!current.bonded)spark([nozzle[0]+.12,nozzle[1]-.55,.1]);
  }
  if(caseId==='valley'){
   const fy=fluidTop+.05,joint=fy+.5,float=sphere(.27,[.35,fy,.25],'#d1dce2');float.userData={pickable:true,part:'float'};
   if(current.bonded)tube([[.35,fy,.25],[.35,.1,.25],[r,.1,.25]],'#087e8b',.025);else{tube([[.35,fy,.25],[.35,joint-.08,.25]],'#708999',.025);tube([[.35,joint+.08,.25],[.35,.1,.25],[r,.1,.25]],'#708999',.025);}
   label('液位浮子',[.6,fy+.35,1.3]);label('外壳接地 ≠ 每个内部零件都已连通',[-.5,1.25,0],'#805e31',.43);
   if(current.step>=2&&!current.bonded)spark([.35,joint,.25]);
  }
  if(caseId==='glenpool'){
   if(current.vaporVisible){const vh=Math.max(.1,cy+h/2-fluidTop-.12);cylinder(r*.89,vh,[0,fluidTop+.04+vh/2,0],'#e6b55f',.12);label('残留可燃气氛（颜色表示不可见气体）',[0,1.2,0],'#906525',.42)}
   if(current.step===1)label('抽出液体，不等于清除罐内气氛',[0,.65,1.4],'#98652d',.43);
   tube([[-3.4,-3.2,0],[-1.9,-3.2,0],[-1.4,-3.1,0]],'#566d79',.1);
   if(current.step===1){arrow([-2.2,-3.1,.1],[-1,0,0],'#ae8145',.8);label('汽油移出',[-2.6,-2.6,1.2],'#8f662d',.43)}
   if(current.step>=2){arrow([-2.8,-3.1,.1],[1,0,0],'#ae8145',.8);label('柴油灌入',[-2.6,-2.6,1.2],'#8f662d',.43);chargeMarks(true)}
   label('液面和接口位置为过程示意，非事故几何复原',[0,2,0],'#536e7d',.4);
   if(current.step===3)spark([-.8,-.6,.6]);
  }
  if(current.step===3){label('事件后果请对照现场照片',[0,2.15,0],'#a75641',.5);if(caseId==='glenpool'||!current.bonded){const glow=sphere(r*1.1,[0,-.3,0],'#d97940',.07);glow.scale.y=.7;}}
 }
 function chip(){
  box([5.4,.16,4],[-.2,-2.6,0],'#547f78');box([2.15,.38,1.65],[0,-2.28,0],'#263b4b');
  for(let side of [-1,1])for(let i=0;i<7;i++){const x=-.85+i*.28;box([.13,.11,.62],[x,-2.32,side*1.05],'#c1cbd1');view.line([[x,-2.48,side*1.3],[x,-2.48,side*1.8],[x+.2,-2.48,side*1.8]],'#accdb0','case-vectors');}
  label('芯片与引脚',[-.7,-1.6,-.9]);const gap=[1.2,.5,.08,.08][current.step],target=[.84,-2.265,1.05];
  const tool=new THREE.Mesh(new THREE.CylinderGeometry(.16,.07,2.1,24),material('#a9b7c2',1,.7));tool.rotation.z=-.5;tool.position.set(target[0]+Math.sin(.5)*1.05,target[1]+gap+Math.cos(.5)*1.05,target[2]);group().add(tool);
  const tip=[target[0],target[1]+gap,target[2]],top=[tool.position.x+Math.sin(.5)*1.05,tool.position.y+Math.cos(.5)*1.05,target[2]];
  label(current.grounded?'物体已连到受控路径':'带电物体',[.9,1.5,0]);
  if(!current.grounded)for(let i=0;i<3;i++)label('+',[tool.position.x+.25,tool.position.y-.3+i*.3,target[2]],'#93611c',.24);
  if(current.grounded){tube([top,[2.7,.7,1.05],[3,-2.6,1.05]],'#087e8b',.04);earth(3,1.05,true,'受控接地点');label('电荷沿受控路径泄放，器件条件仍需核对',[2.5,.7,0],'#087e8b',.43);}else label('缺少泄放路径',[2.3,.7,0],'#9d7136',.43);
  if(current.step>=2&&!current.grounded){tube([tip,[tip[0]+.04,(tip[1]+target[1])/2,tip[2]],target],'#eab63e',.014);sphere(.13,[target[0],target[1]+gap/2,target[2]],'#f5bd48',.16);label('瞬时电荷转移',[target[0]+.4,target[1]+.55,target[2]+.65],'#91631f',.4);}
  if(current.step===3){box([.48,.02,.45],[0,-2.07,0],current.grounded?'#6c9f8c':'#ce775b');label(current.grounded?'路径改变；仍需核对器件条件':'敏感结构可能受损',[0,-.7,1.2],current.grounded?'#087e8b':'#a45640',.47)}
 }
 function collector(){
  const charged=current.chargeOn&&current.step>=1,field=current.fieldOn&&current.step>=2;
  box([9,.18,4],[0,-2.7,0],'#9aafb9');box([9,.12,4],[0,1.1,0],'#a8bdc5',.18);
  for(const z of [-1.65,1.65]){box([8,3.3,.08],[0,-.85,z],z<0?'#d7a497':'#83b0c5',.42);label(z<0?'放电电极侧':'收集极板',[z<0?-.5:1.8,1.45,z],z<0?'#ac594c':'#356d8b',.43);}
  for(let x=-3;x<=3;x+=1.5){const wire=cylinder(.024,3.1,[x,-.8,-1.1],'#687d89');}
  label(charged&&field?'向前流动，向侧面偏移':field?'有电场，未带电颗粒不偏转':'颗粒随气流向前',[-1,2.1,0]);arrow([-4.6,-.7,0],[1,0,0],'#718d98',1.2);label('含尘气流',[-4.1,.3,0],'#446574');
  if(field)for(let x=-2.5;x<=2.5;x+=2.5)arrow([x,.3,-.7],[0,0,1],'#3689b2',1.1);
  dust=[];for(let i=0;i<24;i++){const radius=.055+.015*(i%3),startY=-1.95+(i%5)*.47,startZ=-.95+(i%4)*.27,m=sphere(radius,[-4+i/24*8,startY,startZ],charged?'#dca747':'#637986');dust.push({mesh:m,radius,phase:i/24,startY,startZ});}
  label(charged?'颗粒带正电（示例）':'颗粒未带电',[1,-2.2,2.4],charged?'#8a621c':'#4d6877',.43);if(!field)label(current.step<2?'此步尚未引入收集电场':'收集电场已关闭',[0,.5,0],'#596d78',.4);
  if(current.step===3&&charged&&field)label('接触极板即停留；动画循环补入新颗粒',[0,2.5,0],'#356d8b',.4);
 }
 function rebuild(){for(const name of ['case','case-labels','case-vectors'])view.clearLayer(name);notes.replaceChildren();dust=[];if(caseId==='esd')chip();else if(caseId==='esp')collector();else tank();}
 view.onPick((p,obj)=>{if(obj?.userData?.part)onInspect?.(obj.userData.part)});
 view.frameFn=t=>{if(caseId!=='esp')return;for(const d of dust){const u=((t/6500+d.phase)%1);let z=d.startZ,x=-4+u*8;if(current.step>=2&&current.fieldOn&&current.chargeOn){const contact=1.61-d.radius,hit=Math.sqrt((contact-d.startZ)/3),a=Math.min(u,hit);z=d.startZ+3*a*a;x=-4+8*a;}d.mesh.position.set(x,d.startY,z);}};
 rebuild();return {update(next){current={...current,...next};rebuild()},dispose(){notes.remove();view.dispose()}};
}

