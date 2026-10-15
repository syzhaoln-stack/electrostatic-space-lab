import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Matrix4,Quaternion,Vector3,Box3} from '../vendor/three.module.js';

const root=new URL('../assets/models/',import.meta.url), reports=[];
for(const name of ['desmoines','tank']){
 const bytes=fs.readFileSync(new URL(name+'.glb',root));
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const jsonSize=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+jsonSize).toString());
 assert.equal(g.asset.version,'2.0');assert.ok(bytes.length<15e6);
 const names=g.nodes.map(n=>n.name);
 const required=name==='desmoines'?['container_shell','container_front','liquid','nozzle','insulator','hose','pump','counterweight','bonding_wire','ground_wire']:['tank_shell','tank_front','tank_roof_front','liquid','float','float_tape','inlet','ground_wire','bonding_wire','gauge_system'];
 required.forEach(n=>assert.ok(names.includes(n),name+' missing '+n));
 let primitives=0,triangles=0;
 for(const mesh of g.meshes)for(const p of mesh.primitives){assert.equal(p.mode??4,4);primitives++;triangles+=(p.indices!=null?g.accessors[p.indices].count:g.accessors[p.attributes.POSITION].count)/3;}
 for(const view of g.bufferViews)assert.ok((view.byteOffset??0)+view.byteLength<=g.buffers[view.buffer].byteLength);
 const bounds=new Box3(),walk=(id,parent,seen=new Set())=>{
  assert.ok(!seen.has(id),'node cycle');const next=new Set(seen).add(id),n=g.nodes[id];
  const local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation??[0,0,0])),new Quaternion(...(n.rotation??[0,0,0,1])),new Vector3(...(n.scale??[1,1,1])));
  const world=parent.clone().multiply(local);
  if(n.mesh!=null)for(const p of g.meshes[n.mesh].primitives){const a=g.accessors[p.attributes.POSITION];assert.ok([...a.min,...a.max].every(Number.isFinite));for(const x of [a.min[0],a.max[0]])for(const y of [a.min[1],a.max[1]])for(const z of [a.min[2],a.max[2]])bounds.expandByPoint(new Vector3(x,y,z).applyMatrix4(world));}
  for(const child of n.children??[])walk(child,world,next);
 };
 for(const id of g.scenes[g.scene??0].nodes)walk(id,new Matrix4());
 assert.ok(bounds.min.y>-.02&&bounds.max.y<4.1,'metre-scale Y-up assembly expected');
 assert.ok(g.meshes.length<55,'decorative draw calls should be batched');
 reports.push({asset:name+'.glb',bytes:bytes.length,nodes:g.nodes.length,meshes:g.meshes.length,primitives,triangles,materials:g.materials.length,worldBoundsMetres:{min:bounds.min.toArray().map(n=>+n.toFixed(4)),max:bounds.max.toArray().map(n=>+n.toFixed(4))}});
}
const report={validatedAt:new Date().toISOString(),totalBytes:reports.reduce((s,r)=>s+r.bytes,0),assets:reports};
fs.writeFileSync(new URL('asset-validation.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
