import {FieldScene,THREE} from './scene.js';
import {movingChargeAt,movingSource} from './moving-charge-physics.js';

/** A compact live preview of the same retarded-field model as the full lesson. */
export function mountHomeField(host){
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='./home-field.css';document.head.append(sheet);
 host.innerHTML='<section class="home-field"><div class="home-field-stage" aria-label="振荡电荷的电场，三维箭头表示各位置的方向"></div><div class="home-field-title"><span>振荡的电荷</span><small>青色箭头 · 电场 E</small></div><div class="home-field-actions"><button type="button" id="home-wave-play">暂停</button><a href="charge.html#propagation">进入实验 ↗</a></div></section>';
 const scene=new FieldScene(host.querySelector('.home-field-stage'),{extent:12});scene.grid.visible=false;scene.floor.visible=false;scene.clearLayer('axes');scene.scene.background.set('#010405');scene.scene.fog.color.set('#010405');scene.scene.fog.near=14;scene.scene.fog.far=28;scene.controls.enablePan=false;scene.controls.enableZoom=false;
 const options={amplitude:1,frequency:10e6},samples=[];
 for(let z=-7;z<=7;z++)for(let x=-30;x<=30;x++){if(x===0&&z===0)continue;samples.push([x*.5,0,z*.5]);}
 const positions=new THREE.Float32BufferAttribute(new Float32Array(samples.length*6),3),colours=new THREE.Float32BufferAttribute(new Float32Array(samples.length*6),3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',positions);geometry.setAttribute('color',colours);
 scene.layer('wave').add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.9})));
 const heads=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,6),new THREE.MeshBasicMaterial({color:'#ffffff'}),samples.length);heads.frustumCulled=false;scene.layer('wave').add(heads);
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(.105,24,18),new THREE.MeshStandardMaterial({color:'#ff846b',emissive:'#cf4728',emissiveIntensity:.25,roughness:.3}));scene.layer('source').add(sphere);
 const pose=new THREE.Object3D(),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),colour=new THREE.Color(),base=new THREE.Color('#69bed2');
 const preference=matchMedia('(prefers-reduced-motion: reduce)');let time=540e-9,running=!preference.matches,visible=true,last=0,lastDraw=-Infinity;
 const button=host.querySelector('#home-wave-play');function sync(){button.textContent=running?'暂停':'开始振荡';button.setAttribute('aria-pressed',String(running));}
 function draw(){sphere.position.fromArray(movingSource(time,options).position.map(v=>v/10));for(let i=0;i<samples.length;i++){const p=samples[i],E=movingChargeAt(p.map(v=>v*10),time,options).E,m=Math.hypot(...E),length=.32*Math.tanh(m/.014);direction.fromArray(E).normalize();const tip=new THREE.Vector3(...p).addScaledVector(direction,length),h=length*.3;positions.setXYZ(2*i,...p);positions.setXYZ(2*i+1,tip.x,tip.y,tip.z);colour.copy(base).multiplyScalar(.22+.78*Math.tanh(m/.014));colours.setXYZ(2*i,colour.r,colour.g,colour.b);colours.setXYZ(2*i+1,colour.r,colour.g,colour.b);pose.position.copy(tip).addScaledVector(direction,-h/2);pose.quaternion.setFromUnitVectors(up,direction);pose.scale.set(length*.105,h,length*.105);pose.updateMatrix();heads.setMatrixAt(i,pose.matrix);heads.setColorAt(i,colour);}positions.needsUpdate=true;colours.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;heads.instanceColor.needsUpdate=true;host.dataset.timeNs=(time*1e9).toFixed(2);}
 function camera(){const small=scene.camera.aspect<2.5;scene.camera.position.set(small?2:1,small?6:4.6,small?8:6.5);scene.controls.target.set(0,0,0);scene.camera.lookAt(0,0,0);scene.controls.update();}const resize=scene.resize.bind(scene);scene.resize=()=>{resize();camera();};camera();
 scene.frameFn=now=>{const dt=last?Math.min(.08,(now-last)/1000):0;last=now;if(!visible||!running||document.hidden)return;time+=dt*32e-9;if(now-lastDraw>48){draw();lastDraw=now}};
 button.onclick=()=>{running=!running;sync();draw()};const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting});observer.observe(host);const motion=e=>{if(e.matches){running=false;sync()}};preference.addEventListener('change',motion);draw();sync();
 return()=>{observer.disconnect();preference.removeEventListener('change',motion);scene.dispose();sheet.remove();host.innerHTML=''};
}
