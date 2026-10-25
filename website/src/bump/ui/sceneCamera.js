import {fitPortraitFieldOfView} from './deviceMotion.js';

// Wide poses from the existing Theatre scenes. Only the mobile camera rests
// here; the original character rigs, scroll poses and paper continue playing.
export const mobileSceneViews={
 hero:{position:{x:0,y:.74,z:10.34},target:{x:0,y:.54,z:1},fov:30},
 workflow:{position:{x:.39,y:-.05,z:4.81},target:{x:-.31,y:-.16,z:1},fov:30},
 software:{position:{x:0,y:.25,z:2.71548},target:{x:.28983,y:.2,z:.00623},fov:30},
 security:{position:{x:0,y:-.98,z:4.71},target:{x:0,y:-.38,z:1},fov:32},
 method:{position:{x:0,y:-1.03,z:4.21},target:{x:0,y:-.36,z:0},fov:30},
 vision:{position:{x:-.12,y:-.73,z:5.81},target:{x:0,y:-.48,z:1},fov:30},
 company:{position:{x:0,y:-2.55,z:9.56917},target:{x:0,y:-.74026,z:-3.84075},fov:30}
};
const rotation={x:0,y:0,z:0};

export function resolveSceneCamera(sceneId,authored,size,mobile){
 const profile=mobile&&mobileSceneViews[sceneId];
 if(!profile)return {...authored,fov:authored.freeOrbit?90:authored.fov,mobile:false};
 return {...authored,...profile,rotation,gaze:1.05,freeOrbit:false,mobile:true,
  fov:fitPortraitFieldOfView(profile.fov,size.width,size.height)};
}

// Every camera lifecycle path calls this same projection rule. An incoming
// scene must never rewrite another scene's first PerspectiveCamera.
export function applySceneProjection(camera,sceneId,authored,size,mobile){
 const view=resolveSceneCamera(sceneId,authored,size,mobile),aspect=size.width>0&&size.height>0?size.width/size.height:camera.aspect;
 if(camera.fov!==view.fov||camera.aspect!==aspect){camera.fov=view.fov;camera.aspect=aspect;camera.updateProjectionMatrix();}
 if(view.mobile){camera.userData.bumpMobileScene=sceneId;camera.userData.bumpMobileView=view;}
 else{delete camera.userData.bumpMobileScene;delete camera.userData.bumpMobileView;}
 return view;
}
