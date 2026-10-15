import {THREE} from './scene.js';

// Both cameras observe the SAME scene and simulated particle. Only the two
// field-sampling planes and their labels have camera-specific render layers.
export function attachDualViews(scene, xyHost, xzHost) {
 const cameras=[new THREE.OrthographicCamera(-7.2,7.2,4,-4,.1,100),new THREE.OrthographicCamera(-7.2,7.2,4,-4,.1,100)];
 cameras[0].position.set(0,0,30);cameras[0].up.set(0,1,0);cameras[0].layers.enable(1);
 cameras[1].position.set(0,-30,0);cameras[1].up.set(0,0,1);cameras[1].layers.enable(2);
 cameras.forEach(c=>c.lookAt(0,0,0));
 scene.camera=cameras[0];scene.controls.object=cameras[0];scene.controls.enabled=false;scene.controls.enableDamping=false;
 scene.cameraMove=null;scene.grid.visible=false;scene.layer('axes').visible=false;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;xzHost.append(renderer.domElement);
 scene.renderer.domElement.removeEventListener('pointerdown',scene.down);scene.renderer.domElement.removeEventListener('pointerup',scene.up);
 const renderers=[scene.renderer,renderer],hosts=[xyHost,xzHost],disposers=[];
 function resize(){hosts.forEach((host,i)=>{const {width,height}=host.getBoundingClientRect(),aspect=Math.max(1,width)/Math.max(1,height),camera=cameras[i];camera.left=-7.25;camera.right=7.25;camera.top=7.25/aspect;camera.bottom=-7.25/aspect;camera.updateProjectionMatrix();renderers[i].setSize(Math.max(1,width),Math.max(1,height),false);});}
 const observer=new ResizeObserver(resize);hosts.forEach(h=>observer.observe(h));resize();
 renderers.forEach((r,i)=>{let down=null;const onDown=e=>down=[e.clientX,e.clientY],onUp=e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=r.domElement.getBoundingClientRect(),mouse=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),ray=new THREE.Raycaster();ray.layers.mask=cameras[i].layers.mask;ray.setFromCamera(mouse,cameras[i]);const hit=ray.intersectObjects(scene.scene.children,true).find(h=>h.object.userData.pickable);if(hit)scene.picker?.(hit.point.toArray(),hit.object,hit);};r.domElement.addEventListener('pointerdown',onDown);r.domElement.addEventListener('pointerup',onUp);disposers.push(()=>{r.domElement.removeEventListener('pointerdown',onDown);r.domElement.removeEventListener('pointerup',onUp);});});
 return {render(){renderer.render(scene.scene,cameras[1]);},only(layerName,plane){scene.layer(layerName).traverse(o=>o.layers.set(plane==='xy'?1:2));},dispose(){observer.disconnect();disposers.forEach(fn=>fn());renderer.dispose();renderer.domElement.remove();}};
}
