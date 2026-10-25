/** Original Bump sculpture. All returned SolidPaths are Anatomy kit geometry. */
export const TAU = Math.PI * 2;
export const MODULE = 2.25;
export const CENTRAL_TEETH = 16;
export const SATELLITE_TEETH = 12;
export const ENGAGED_RADIUS = MODULE * (CENTRAL_TEETH + SATELLITE_TEETH) / 2;
export const PHASE_STEPS = 160;
export const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
export const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };

// Involute flanks share a module, a 20 degree pressure angle and 0.12 u backlash.
// The small root fillet is represented by a short root arc, never an overlaid tooth.
export function toothRing(teeth, tooth=0, phase=0, module=MODULE) {
  const pitch=module*teeth/2, root=pitch-1.25*module, outer=pitch+module;
  const pressure=20*Math.PI/180, base=pitch*Math.cos(pressure);
  const inv=a=>Math.tan(a)-a;
  const half=Math.PI/(2*teeth)-.12/(2*pitch);
  const flank=r=>half+inv(pressure)-inv(Math.acos(Math.min(1,base/r)));
  const low=Math.max(root,base), start=flank(low), top=flank(outer);
  const angle=tooth*TAU/teeth+phase;
  const points=[];
  const point=(a,r)=>points.push([Math.cos(a)*r,Math.sin(a)*r]);
  point(angle-start,root);
  for(let j=0;j<=4;j++){const r=low+(outer-low)*j/4;point(angle-flank(r),r);}
  for(let j=1;j<=3;j++)point(angle-top+2*top*j/3,outer);
  for(let j=3;j>=0;j--){const r=low+(outer-low)*j/4;point(angle+flank(r),r);}
  point(angle+start,root);
  const outerCount=points.length;
  for(let j=1;j<4;j++)point(angle+start-2*start*j/4,root);
  points.outerCount=outerCount;
  return points;
}
export function gearRing(teeth,phase=0,module=MODULE){
 const points=[];
 for(let i=0;i<teeth;i++){
  const ring=toothRing(teeth,i,phase,module);
  points.push(...ring.slice(0,ring.outerCount));
  const start=Math.atan2(ring[0][1],ring[0][0]);
  const root=module*teeth/2-1.25*module;
  const a=i*TAU/teeth+phase;
  const half=Math.abs(Math.atan2(Math.sin(start-a),Math.cos(start-a)));
  for(let j=1;j<4;j++){const angle=a+half+(TAU/teeth-2*half)*j/4;points.push([Math.cos(angle)*root,Math.sin(angle)*root]);}
 }
 return points;
}

export function sculptureConfig(mobile = false) {
  const angles = (mobile ? [-100, 20, 140] : [-105, 15, 135]).map(d => d * Math.PI / 180);
  const radii = mobile ? [45, 46, 47] : [51, 54, 57];
  const offsets = (mobile ? [-12, 11, -7] : [-16, 13, -10]).map(d => d * Math.PI / 180);
  return {
    mobile, width: mobile ? 430 : 760, height: mobile ? 460 : 570,
    radius: mobile ? 61 : 72, gearZ: mobile ? 55 : 63,
    azimuth: mobile ? 20 : 43, elevation: mobile ? 45 : 31,
    modules: angles.map((angle, i) => ({
      id: `spindle-${i}`, angle,
      start: [Math.cos(angle + offsets[i]) * radii[i], Math.sin(angle + offsets[i]) * radii[i], 0],
      end: [Math.cos(angle) * ENGAGED_RADIUS, Math.sin(angle) * ENGAGED_RADIUS, 0],
      phase: ((CENTRAL_TEETH + SATELLITE_TEETH) / SATELLITE_TEETH) * angle + Math.PI - Math.PI / SATELLITE_TEETH,
      unaligned: [0.32, -0.27, 0.41][i],
    })),
  };
}

/** Pure continuous model; also the exact state source used by the geometric audit. */
export function poseAt(progress, config) {
  const p = clamp(progress);
  const alignment = smooth(0.04, 0.44, p);
  const gather = smooth(0.25, 0.78, p);
  const coupled = smooth(0.8, 1, p);
  const centralPhase = coupled * TAU / CENTRAL_TEETH * 1.6;
  const positions = {};
  const phases = { core: centralPhase };
  for (const mod of config.modules) {
    positions[mod.id] = mod.start.map((v, n) => v + (mod.end[n] - v) * gather);
    const currentAngle = Math.atan2(positions[mod.id][1], positions[mod.id][0]);
    phases[mod.id] = mod.phase + (currentAngle - mod.angle) * (CENTRAL_TEETH + SATELLITE_TEETH) / SATELLITE_TEETH + mod.unaligned * (1 - alignment) - centralPhase * CENTRAL_TEETH / SATELLITE_TEETH;
  }
  return { p, alignment, gather, coupled, positions, phases,
    phase: p < 0.34 ? 'complexity' : p < 0.8 ? 'alignment' : 'coherence' };
}

export function createVisionGeometry(k, mobile = false) {
  const config = sculptureConfig(mobile);
  const { width, height, radius, gearZ } = config;
  const extremes = [];
  for (let i = 0; i < 48; i++) { const a = TAU * i / 48; extremes.push([Math.cos(a) * (radius + 2), Math.sin(a) * (radius + 2), -5]); }
  config.modules.forEach(mod => extremes.push([mod.start[0], mod.start[1], gearZ + 14]));
  extremes.push([0, 0, gearZ + 14]);
  const P = k.fitProjection(extremes, width, height, { pad: mobile ? 22 : 28, azimuth: config.azimuth, elevation: config.elevation });
  const parts = [];
  const gearFrames = new Map();
  const add = (id, group, shape, material = 'ivory', detail = []) => {
    const paths = pathsOf(shape, k, P);
    const at = shape.kind === 'cylinder' ? [shape.x, shape.y, shape.z + shape.h / 2] : [shape.ring.reduce((a,p)=>a+p[0],0)/shape.ring.length,shape.ring.reduce((a,p)=>a+p[1],0)/shape.ring.length,shape.z+shape.h/2];
    const part = { id, group, shape, material, detail, paths, at, key: k.depthOf(at, P) };
    parts.push(part); return part;
  };
  const cylinder = (id, group, x, y, r, z, h, material, bevel = 0.5, detail = []) => add(id, group, { kind:'cylinder',x,y,r,z,h,bevel,steps:r > 20 ? 96 : r > 5 ? 64 : 24 }, material, detail);
  const screw = (id, group, x, y, z, r = 0.8) => cylinder(id, group, x, y, r, z, 0.55, 'brass', 0.12, [{d:k.lineOnTop([x-r,y],[x+r,y],z+0.55,P),tone:'mid'}]);
  const ringLine = (x,y,r,z,tone='faint') => ({ d:k.ring(x,y,r,z,P,64),tone });

  // Everything on the floor is supported, including every intermediate shoe position.
  for (let i = 0; i < 4; i++) { const a = (45 + i * 90) * Math.PI / 180; cylinder(`stand.foot-${i}`, 'stand', Math.cos(a)*(radius-15), Math.sin(a)*(radius-15), 5.6, -4, 4, 'green', 0.55); }
  cylinder('stand.foundation', 'stand', 0,0,radius,0,7.6,'ivory',1.1);
  cylinder('stand.inset', 'stand',0,0,radius-3.8,7.6,0.9,'ceramic',0.4,[ringLine(0,0,radius-5.5,8.5)]);
  for(let i=0;i<4;i++){const a=(10+i*90)*Math.PI/180; screw(`stand.fixing-${i}`,'stand',Math.cos(a)*(radius-8),Math.sin(a)*(radius-8),8.5,1.05);}

  const assembly = (id, central = false) => {
    const r = central ? 12.3 : 8.7;
    cylinder(`${id}.shoe`,id,0,0,r,8.5,2.7,'ivory',0.7,[ringLine(0,0,r-1.2,11.2,'lo')]);
    cylinder(`${id}.socket`,id,0,0,central?8.4:5.7,11.2,5.6,'green',0.45);
    cylinder(`${id}.seat`,id,0,0,central?9.4:6.6,16.8,2.1,'brass',0.4);
    cylinder(`${id}.spindle`,id,0,0,central?3.9:2.8,18.9,gearZ-2.8-18.9,'brass',0.25);
    cylinder(`${id}.bearing`,id,0,0,central?7:5.6,gearZ-2.8,2.8,'ivory',0.4,[ringLine(0,0,central?5.8:4.7,gearZ,'lo')]);
    const n=central?CENTRAL_TEETH:SATELLITE_TEETH;
    const root=MODULE*n/2-1.25*MODULE;
    cylinder(`${id}.gear-body`,id,0,0,root,gearZ,4.2,central?'green':'brass',0);
    for(let tooth=0;tooth<n;tooth++){
      const ring=toothRing(n,tooth);
      const gear=add(`${id}.tooth-${tooth}`,id,{kind:'geartooth',teeth:n,tooth,ring,z:gearZ,h:4.2,bevel:0},central?'green':'brass');
      const frameKey=`${n}:${tooth}`;
      if(!gearFrames.has(frameKey))gearFrames.set(frameKey,Array.from({length:PHASE_STEPS},(_,i)=>pathsOf({...gear.shape,ring:toothRing(n,tooth,TAU/n*i/PHASE_STEPS)},k,P)));
    }
    cylinder(`${id}.crown`,id,0,0,central?8.1:6.2,gearZ+4.2,1.4,'brass',0.4,[ringLine(0,0,central?7.1:5.3,gearZ+5.6,'lo')]);
    cylinder(`${id}.cap`,id,0,0,central?4.2:3.2,gearZ+5.6,2.2,'ivory',0.45);
    for(let j=0;j<3;j++){
      const a=TAU*j/3; const orbit=central?6.1:4.5;
      const pin=screw(`${id}.pin-${j}`,id,Math.cos(a)*orbit,Math.sin(a)*orbit,gearZ+5.6,0.65);
      pin.orbit={ angle:a, radius:orbit };
    }
    for(let j=0;j<(central?3:2);j++){
      const a=(j/(central?3:2))*TAU+(central?Math.PI/6:Math.PI/3);
      screw(`${id}.fixing-${j}`,id,Math.cos(a)*(r-2),Math.sin(a)*(r-2),11.2,0.75);
    }
  };
  assembly('core',true);
  config.modules.forEach(mod=>assembly(mod.id));
  const origin=k.iso([0,0,0],P);
  return {config,P,width,height,parts,gearFrames,origin,
    floorShadow:k.ring(0,0,radius-5,-3.9,P,96),
    pathsForShape:shape=>pathsOf(shape,k,P),
    translate:offset=>{const p=k.iso(offset,P);return [p[0]-origin[0],p[1]-origin[1]];},
    depth:offset=>k.depthOf(offset,P),
  };
}

export function pathsOf(shape,k,P){
  if(shape.kind==='cylinder')return k.cylinder(shape.x,shape.y,shape.r,shape.z,shape.h,P,shape.steps,shape.bevel);
  const paths=k.extrude(shape.ring,shape.z,shape.h,P,{convex:false,bevel:0});
  if(shape.kind!=='geartooth')return paths;
  // Keep the actual kit sector fill/top/shades, suppress only the shared internal
  // root contact strokes. The outer tooth silhouette is still the real projected edge.
  const count=shape.ring.outerCount||14;
  const outer=shape.ring.slice(0,count);
  const viewer=k.towardViewer(P);
  const faces=outer.slice(0,-1).map((a,i)=>{const b=outer[i+1];return(b[1]-a[1])*viewer[0]-(b[0]-a[0])*viewer[1]>0;});
  const top=p=>[p[0],p[1],shape.z+shape.h];
  const bottom=p=>[p[0],p[1],shape.z];
  let outline='',crease='';
  for(let i=0;i<outer.length-1;i++){
    const a=outer[i],b=outer[i+1];
    if(faces[i]){outline+=k.segment(bottom(a),bottom(b),P);crease+=k.segment(top(a),top(b),P);}
    else outline+=k.segment(top(a),top(b),P);
    if(i>0&&faces[i]!==faces[i-1])outline+=k.segment(top(a),bottom(a),P);
  }
  return {...paths,outline,crease,bevel:''};
}

export function gearFrame(phase,teeth){const unit=TAU/teeth;return Math.round((((phase%unit)+unit)%unit)/unit*PHASE_STEPS)%PHASE_STEPS;}
export function worldOffset(part,pose){
  const move=pose.positions[part.group]||[0,0,0];
  if(!part.orbit)return move;
  const a=part.orbit.angle, r=part.orbit.radius, phase=pose.phases[part.group]||0;
  return [move[0]+Math.cos(a+phase)*r-Math.cos(a)*r,move[1]+Math.sin(a+phase)*r-Math.sin(a)*r,0];
}

export function depthOffset(part,pose,geometry){
 const offset=worldOffset(part,pose);
 let depth=geometry.depth(offset);
 if(part.shape.kind==='geartooth'){
  const unit=TAU/part.shape.teeth;
  const phase=gearFrame(pose.phases[part.group]||0,part.shape.teeth)/PHASE_STEPS*unit;
  const [x,y]=part.at;
  depth+=geometry.depth([x*Math.cos(phase)-y*Math.sin(phase)-x,x*Math.sin(phase)+y*Math.cos(phase)-y,0]);
 }
 return depth;
}
