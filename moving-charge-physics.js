/**
 * Complete Lienard-Wiechert field of the prescribed, smoothly started point
 * charge used in the propagation lesson. All inputs and outputs are SI.
 *
 * E_near = kq (1-beta²)(n-beta) / [kappa³ R²]
 * E_rad  = kq n × [(n-beta) × a] / [c² kappa³ R]
 * B = n × (E_near + E_rad) / c; kappa = 1 - n·beta.
 * Every source quantity is evaluated at tr = t - |r-rq(tr)|/c.
 *
 * Primary reference: Michael Fowler, University of Virginia, lecture 67,
 * "The Lienard-Weichert Potentials and Fields", Electric and Magnetic Fields:
 * https://galileoandeinstein.phys.virginia.edu/Elec_Mag/2022_Lectures/EM_67_Lienard_Weichert.html
 * Also: Feynman Lectures II 21-5 (retarded potentials).
 * https://www.feynmanlectures.caltech.edu/II_21.html
 * Likharev, Essential Graduate Physics, Classical Electrodynamics 10.1,
 * equations (10.19)-(10.20), confirms BOTH full E and B=n_ret×E/c:
 * https://phys.libretexts.org/Bookshelves/Electricity_and_Magnetism/Essential_Graduate_Physics_-_Classical_Electrodynamics_(Likharev)/10:_Radiation_by_Relativistic_Charges/10.01:_Lienard-Wiechert_Potentials
 *
 * No far-zone approximation, artificial core softening, or radius cutoff.
 * The point itself is singular and throws RangeError. The displayed sphere
 * must be treated as a position icon, not as a finite conducting sphere.
 * The motion is prescribed; radiation reaction and external material are
 * omitted. `nearE` means the complete velocity-dependent 1/R² term, not
 * an instantaneous Coulomb field. `radiationE` is the acceleration 1/R term.
 */
import {RADIATION, drivenSource, cross} from './propagation-physics.js';

export const MOVING_CHARGE = Object.freeze({
 c:RADIATION.c, k:RADIATION.k, charge:1e-9, amplitude:.3, frequency:15e6,
});
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const subtract=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const norm=a=>Math.hypot(a[0],a[1],a[2]);

function parameters(options={}) {
 const amplitude=options.amplitude??MOVING_CHARGE.amplitude;
 const frequency=options.frequency??MOVING_CHARGE.frequency;
 const charge=options.charge??MOVING_CHARGE.charge;
 if(!Number.isFinite(amplitude)||amplitude<0||!Number.isFinite(frequency)||frequency<=0||!Number.isFinite(charge))
  throw new RangeError('Finite nonnegative amplitude, positive frequency and finite charge are required.');
 // |g| <= 1 and max |dg/dt| = 0.9375 f for the two-period quintic ramp.
 // This conservative bound also covers the switch-on, not just steady motion.
 if(amplitude*frequency*(2*Math.PI+.9375)>=MOVING_CHARGE.c)
  throw new RangeError('The prescribed motion must remain subluminal, including switch-on.');
 return {amplitude,frequency,charge};
}

/** Current source state (m, m/s, m/s²); same C² switch-on as drivenSource. */
export function movingSource(time,options={}) {
 if(!Number.isFinite(time))throw new RangeError('Finite observation time required.');
 return drivenSource(time,parameters(options));
}

/**
 * Solve the light-cone intersection in distance s=c(t-tr), avoiding subtraction
 * of nearly equal times in the residual. Bounded source motion supplies a
 * bracket; safeguarded Newton steps use d(s-R)/ds = 1-n·beta > 0.
 */
function retardedState(observer,time,p) {
 const current=drivenSource(time,p),currentDistance=norm(subtract(observer,current.position));
 if(currentDistance===0)throw new RangeError('The field is singular at the moving point charge.');
 const originDistance=norm(observer);
 let lower=Math.max(0,originDistance-p.amplitude),upper=originDistance+p.amplitude;
 let distance=Math.min(upper,Math.max(lower,currentDistance));
 for(let iteration=0;iteration<64;iteration++) {
  const retardedTime=time-distance/MOVING_CHARGE.c;
  const source=drivenSource(retardedTime,p),displacement=subtract(observer,source.position),radius=norm(displacement);
  const residual=distance-radius;
  const tolerance=32*Number.EPSILON*Math.max(1e-6,originDistance,p.amplitude,radius);
  if(Math.abs(residual)<=tolerance) {
   if(radius===0)throw new RangeError('The field is singular at the moving point charge.');
   return {source,displacement,radius,retardedTime,delay:distance/MOVING_CHARGE.c,residual,iterations:iteration+1};
  }
  if(residual>0)upper=distance;else lower=distance;
  const slope=radius>0?1-dot(displacement,source.velocity)/(radius*MOVING_CHARGE.c):1;
  const candidate=distance-residual/slope;
  distance=Number.isFinite(candidate)&&candidate>lower&&candidate<upper?candidate:(lower+upper)/2;
 }
 throw new Error('Retarded-time solver did not converge.');
}

/**
 * Complete E and B at an observation point and time. `position`, `velocity`,
 * `acceleration` are the RETARDED source state. Use movingSource(t) for the
 * source icon's current location. `radE` aliases `radiationE` for the UI.
 */
export function movingChargeAt(observer,time,options={}) {
 if(!observer||observer.length!==3||![...observer].every(Number.isFinite)||!Number.isFinite(time))
  throw new RangeError('A finite three-component observation position and finite time are required.');
 const p=parameters(options),retarded=retardedState(observer,time,p);
 const {source,radius,retardedTime,delay,displacement}=retarded;
 const n=displacement.map(value=>value/radius),beta=source.velocity.map(value=>value/MOVING_CHARGE.c);
 const beta2=dot(beta,beta),kappa=1-dot(n,beta),nMinusBeta=subtract(n,beta);
 if(!(beta2<1&&kappa>0))throw new RangeError('A subluminal retarded source velocity is required.');
 const denominator=kappa**3,nearFactor=MOVING_CHARGE.k*p.charge*(1-beta2)/(denominator*radius**2);
 const radiationFactor=MOVING_CHARGE.k*p.charge/(MOVING_CHARGE.c**2*denominator*radius);
 const nearE=nMinusBeta.map(value=>nearFactor*value);
 const radiationE=cross(n,cross(nMinusBeta,source.acceleration)).map(value=>radiationFactor*value);
 const E=nearE.map((value,index)=>value+radiationE[index]),B=cross(n,E).map(value=>value/MOVING_CHARGE.c);
 return {E,nearE,radiationE,radE:radiationE,B,n,retardedTime,delay,radius,
  position:source.position,velocity:source.velocity,acceleration:source.acceleration,
  residual:retarded.residual,iterations:retarded.iterations};
}
