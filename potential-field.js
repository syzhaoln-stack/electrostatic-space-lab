import {THREE} from './scene.js';
import {fieldAt} from './physics.js';
import {POTENTIAL_LEVELS,equipotentialProfile} from './potential-surfaces.js';

// Three regular sampling layers show the true 3D sum. Arrow length is compressed
// with one fixed scale; no field-line density or animation speed encodes charge.
export function drawPotentialTotalField(scene,sources){
  const samples=[];
  for(const z of [-1.4,0,1.4])for(let iy=-7;iy<=7;iy++)for(let ix=-7;ix<=7;ix++){
    const p=[ix*.61,iy*.61,z];
    if(sources.some(s=>Math.hypot(...p.map((x,i)=>x-s.pos[i]))<.43))continue;
    const E=fieldAt(p,sources).E,magnitude=Math.hypot(...E);if(magnitude<1e-8)continue;
    samples.push({p,E,magnitude});
  }
  const g=scene.layer('potential-total-field'),material=new THREE.MeshBasicMaterial({vertexColors:false,toneMapped:false});
  const shafts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.010,.010,1,5),material,samples.length);
  const heads=new THREE.InstancedMesh(new THREE.ConeGeometry(.045,.11,6),material.clone(),samples.length);
  const pose=new THREE.Object3D(),axis=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(),color=new THREE.Color();
  samples.forEach((s,i)=>{
    direction.set(...s.E).normalize();const strength=s.magnitude/(s.magnitude+500),length=.13+.30*strength;
    pose.quaternion.setFromUnitVectors(axis,direction);pose.position.set(...s.p).addScaledVector(direction,(length-.09)/2);pose.scale.set(1,length-.09,1);pose.updateMatrix();shafts.setMatrixAt(i,pose.matrix);
    pose.position.set(...s.p).addScaledVector(direction,length-.045);pose.scale.setScalar(.66+.34*strength);pose.updateMatrix();heads.setMatrixAt(i,pose.matrix);
    color.set('#67c7e5').multiplyScalar((s.p[2]===0?.58:.30)+.26*strength);shafts.setColorAt(i,color);heads.setColorAt(i,color);
  });
  shafts.instanceMatrix.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;shafts.frustumCulled=heads.frustumCulled=false;g.add(shafts,heads);
  return samples.length;
}

/** A surface of revolution of the numerical V=rho,y contour. Only the 0 V
 * member is a plane; no nonzero two-source layer is represented by a sphere. */
export function drawEquipotentialLayers(scene){
 const layers=[],group=scene.layer('equipotentials');
 for(const value of POTENTIAL_LEVELS){
  const color=value>0?'#bf927b':value<0?'#5899bd':'#66aba9',profile=equipotentialProfile(value),g=new THREE.Group();group.add(g);
  const geometry=value?new THREE.LatheGeometry(profile.points.map(p=>new THREE.Vector2(...p)),56):new THREE.PlaneGeometry(10,10);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.025,side:THREE.DoubleSide,depthWrite:false}));if(!value)mesh.rotation.x=-Math.PI/2;mesh.userData={potentialLevel:value,pickable:false};g.add(mesh);
  const wirePositions=[];
  const seg=(a,b)=>wirePositions.push(...a,...b);
  if(value){for(let j=0;j<8;j++){const a=j*Math.PI/4;for(let i=1;i<profile.points.length;i++){const [r0,y0]=profile.points[i-1],[r1,y1]=profile.points[i];seg([r0*Math.cos(a),y0,r0*Math.sin(a)],[r1*Math.cos(a),y1,r1*Math.sin(a)]);}}
   for(const k of [12,24,36,48,60]){const [r,y]=profile.points[k];for(let j=0;j<64;j++){const a=j*Math.PI/32,b=(j+1)*Math.PI/32;seg([r*Math.cos(a),y,r*Math.sin(a)],[r*Math.cos(b),y,r*Math.sin(b)]);}}
  }else{for(const x of [-5,0,5])seg([x,0,-5],[x,0,5]);for(const z of [-5,0,5])seg([-5,0,z],[5,0,z]);}
  const wireGeometry=new THREE.BufferGeometry();wireGeometry.setAttribute('position',new THREE.Float32BufferAttribute(wirePositions,3));const wire=new THREE.LineSegments(wireGeometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.16,depthWrite:false}));g.add(wire);layers.push({value,mesh,wire});
 }
 return {select(value,progress=0,glow=0){for(const layer of layers){const active=layer.value===value;layer.mesh.userData.pickable=active;layer.mesh.material.opacity=active?.016+.060*progress+.14*glow:.004;layer.wire.material.opacity=active?.12+.18*progress+.24*glow:.055;layer.mesh.material.color.set(active?'#7dd8d0':layer.value>0?'#bf927b':layer.value<0?'#5899bd':'#66aba9');layer.wire.material.color.set(active?'#a1f0df':layer.value>0?'#bf927b':layer.value<0?'#5899bd':'#66aba9');layer.mesh.renderOrder=active?2:0;}},count:layers.length};
}
