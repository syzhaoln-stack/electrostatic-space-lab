import {THREE} from './scene.js';
import {fieldAt} from './physics.js';

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
