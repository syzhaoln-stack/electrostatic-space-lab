/** Plane through both sources and the observation point, all in millimetres. */
export function observationFrame(a,b,p) {
 const delta=b.map((x,i)=>x-a[i]),length=Math.hypot(...delta);
 const u=length>1e-9?delta.map(x=>x/length):[1,0,0];
 const origin=a.map((x,i)=>(x+b[i])/2),offset=p.map((x,i)=>x-origin[i]);
 const projection=offset.reduce((sum,x,i)=>sum+x*u[i],0);
 let v=offset.map((x,i)=>x-projection*u[i]);
 if(Math.hypot(...v)<1e-8){const fallback=Math.abs(u[1])<.9?[0,1,0]:[0,0,1];const dot=fallback.reduce((sum,x,i)=>sum+x*u[i],0);v=fallback.map((x,i)=>x-dot*u[i]);}
 const vl=Math.hypot(...v);v=v.map(x=>x/vl);if(v[1]<-1e-8)v=v.map(x=>-x);
 const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 return {origin,u,v,normal};
}
