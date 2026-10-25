import {iso,type Projection} from '../../components/bump-anatomy/kit/iso-kit';
const clamp=(t:number)=>Math.max(0,Math.min(1,t));
const smooth=(t:number)=>{const u=clamp(t);return u*u*(3-2*u);};
const angleBetween=(from:number,to:number)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));

export function portTugPose(stage:number,since:number,index:number){
 // The right tug enters between the paired red/green buoys at x=130.
 const dock={x:index===0?14:-92,y:48},wait={x:index===0?160:-150,y:index===0?58:46};
 const toward=index===0?Math.PI:0,away=index===0?0:Math.PI;
 const depart=stage===4,travel=depart?smooth((since-.9)/1.8):stage===0?smooth((since-1.1)/2.3):1;
 const u=depart?1-travel:travel,v=1-u;
 const c1={x:wait.x+(dock.x-wait.x)*.48,y:wait.y},c2={x:dock.x,y:66};
 const x=v*v*v*wait.x+3*v*v*u*c1.x+3*v*u*u*c2.x+u*u*u*dock.x;
 const y=v*v*v*wait.y+3*v*v*u*c1.y+3*v*u*u*c2.y+u*u*u*dock.y;
 const dx=3*v*v*(c1.x-wait.x)+6*v*u*(c2.x-c1.x)+3*u*u*(dock.x-c2.x);
 const dy=3*v*v*(c1.y-wait.y)+6*v*u*(c2.y-c1.y)+3*u*u*(dock.y-c2.y);
 let angle=stage===0?Math.atan2(dy,dx):depart?Math.atan2(-dy,-dx):-Math.PI/2;
 if(stage===0&&since<1.1)angle=away+angleBetween(away,toward)*smooth((since-.2)/.8);
 if(depart&&since<.9)angle=-Math.PI/2+Math.PI*smooth((since-.15)/.65);
 return{x,y,angle};
}

// Rotate in the water plane, then apply the original isometric projection.
// Every part of a tug shares this pivot and matrix so hull/cabin stay together.
export function portTugMatrix(pose:{x:number,y:number,angle:number},at:readonly[number,number],waterZ:number,P:Projection){
 const o=iso([0,0,0],P),px=iso([1,0,0],P),py=iso([0,1,0],P);
 const a=px[0]-o[0],b=px[1]-o[1],c=py[0]-o[0],d=py[1]-o[1],det=a*d-b*c;
 const theta=pose.angle+Math.PI/2,C=Math.cos(theta),S=Math.sin(theta);
 const r0=a*C+c*S,r1=-a*S+c*C,r2=b*C+d*S,r3=-b*S+d*C;
 const m0=(r0*d-r1*b)/det,m1=(r2*d-r3*b)/det,m2=(-r0*c+r1*a)/det,m3=(-r2*c+r3*a)/det;
 const old=iso([at[0],at[1],waterZ],P),next=iso([pose.x,pose.y,waterZ],P);
 return[m0,m1,m2,m3,next[0]-m0*old[0]-m2*old[1],next[1]-m1*old[0]-m3*old[1]];
}
