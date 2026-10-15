# Godot teaching player

Godot 4.4.1, Compatibility renderer, single-threaded WebGL 2 export. The same exported engine loads three Blender accident apparatus scenes and the two-source electric-field experiment.

## Open

Serve the parent website over localhost or HTTPS, then open `assets/godot/index.html?case=desmoines`, `?case=valley`, `?case=glenpool`, or `?case=field`. The files do not run under a `file:` URL. No COOP/COEP headers are required because threads are disabled. Serve `.wasm` as `application/wasm`.

## Rebuild

Open `project.godot` with Godot 4.4.1. Point the Web export preset at the official `web_nothreads_release.zip` template, available inside the official Godot 4.4.1 export templates. The local installation is in the workspace's sibling `tools/godot` directory. Run from the website root:

```powershell
godot --headless --path godot --editor --import --quit
godot --headless --path godot --script FieldLabMathTest.gd
godot --headless --path godot --export-release Web ../assets/godot/index.html
```

Keep the complete `assets/godot/` directory. `godot/.godot/` is rebuildable cache and should not enter source control. Model source lives in `../blender/`; `models/` holds its GLB output plus scene metadata. Refresh these copies if rebuilding Blender models.

## Parent-page bridge

The iframe accepts messages only from its same-origin parent. When ready it emits `{type:'case-ready'}`; the parent should then resend current state.

Accident state: `{type:'electrostatic-case', caseId:'desmoines'|'valley'|'glenpool', step:0|1|2|3, bonded:boolean, grounded:boolean, liquid:string, fieldOn:boolean, chargeOn:boolean, vaporVisible:boolean}`. Stages never advance automatically. Each stage softly highlights named, real model components and projects a short anchored concept label; reduced motion makes the highlight static. The reduced-motion preference starts visual animation paused. The vapor checkbox changes visibility only. `liquid` is reserved descriptive context; it does not claim a quantitative conductivity model. For Des Moines/Valley a bonded comparison suppresses the isolated-metal spark. Bonding alone does not suppress the Glenpool liquid-charge scenario. Local iframe buttons reset/orbit the camera, zoom into the gap, toggle cutaway, or pause animation. They call the internal callback directly.

Field state: `{type:'electrostatic-field', q1:number, q2:number, sign:-1|1, probe:[x,y,z], sources:[{pos:[x,y,z]},{pos:[x,y,z]}], showField:boolean, showParts:boolean}`. Source charges are pC and positions mm. Optional `reset:true` restores source and probe positions. It emits `{type:'field-reading',E,E1,E2,F,probe,sources,...}` with E in V/m and F in N. A probe defaults to an electron. Arrows use a uniformly sampled plane containing both source centers and P (XY initially), while every field vector keeps all three actual components. The default camera is face-on; space view can be entered via its button or orbiting.

## Teaching scope

Accident apparatus uses original Blender models, measured in metres with Y up. It is informed by investigation diagrams; dimensions, spark endpoints, flame extent, arrow lengths, and charge markers are teaching choices, not a numerical or measured accident reconstruction. Des Moines and Valley spark locations are possible mechanisms. Glenpool uses a separate illustrative liquid/vapor interface, with the Valley float and gauge hidden. Blue arrows and gold markers mean qualitative field direction and charge redistribution. Vapor is represented visibly for explanation although the actual mixture may be invisible. The flame effect is controlled by stage and comparison conditions, without sound or injury imagery.

The field experiment is quantitative: uniformly charged insulating spheres with radius 0.24 mm, exterior Coulomb fields and linear interior fields. It computes E=E1+E2 and F=qE; the test probe does not alter the source solution. Field background arrows use a fixed nonlinear magnitude display; probe vector lengths share a local common scale. F and E glyph lengths have different units and must not be numerically compared. Native Godot numerical fixtures cross-check existing JavaScript physics and 3D glyph orientation.

## Licenses

This player uses Godot Engine, Copyright (c) 2014-present Godot Engine contributors; Copyright (c) 2007-2014 Juan Linietsky, Ariel Manzur, under the MIT license. Full license: [GODOT_LICENSE.txt](GODOT_LICENSE.txt); engine third-party notices: [GODOT_COPYRIGHT.txt](GODOT_COPYRIGHT.txt). Corresponding files ship with the Web export. Official reference: https://godotengine.org/license/.

The apparatus geometry is original to this teaching project. No Microsoft or other system font is redistributed; Chinese labels are HTML rendered using the user's installed fonts. Godot built-in labels are English/math identifiers.
