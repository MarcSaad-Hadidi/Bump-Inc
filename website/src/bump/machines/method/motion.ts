import gsap from 'gsap';
import { offsetOnScreen, type WorkshopGeometry } from './geometry';
import { poseAt, type WorkshopPose } from './model';

/** A finite mechanical story. Seeking the same timeline backwards reverses every action. */
export function createWorkshopTimeline(pose: WorkshopPose, geometry: WorkshopGeometry, draw: () => void) {
  const layout = geometry.layout;
  const tl = gsap.timeline({ paused: true, onUpdate: draw, defaults: { ease: 'power2.inOut' } });
  const audit = poseAt(0, layout);
  const analyse = poseAt(1, layout);
  const proposal = poseAt(2, layout);
  const build = poseAt(3, layout);
  const maintain = poseAt(4, layout);
  tl.set(pose, { ...audit }, 0);
  tl.addLabel('audit', 0);

  // First lift the probe, then transfer and separate supported cartridges along their rails.
  tl.to(pose, { probeDrop: 0, duration: .32 }, 0);
  tl.to(pose, { projectX: analyse.projectX, headX: analyse.headX, duration: .78 }, .2);
  tl.to(pose, { sort: 1, wheel: analyse.wheel, gauge: analyse.gauge, duration: .78 }, .48);
  tl.set(pose, { ...analyse }, 1.3);
  tl.addLabel('analyse', 1.3);

  // The same carriage changes tool. X and Y follow the exact path that is inked below.
  tl.to(pose, { projectX: proposal.projectX, headX: -28, penY: 24, sort: proposal.sort, duration: .5 }, 1.3);
  tl.to(pose, { penDrop: 43.8, duration: .28 }, 1.72);
  const route = geometry.penRoute;
  const lengths = route.slice(1).map((point, index) => {
    const a = route[index];
    const xy = offsetOnScreen(geometry.projection, [point[0] - a[0], point[1] - a[1], 0]);
    return Math.hypot(...xy);
  });
  const total = lengths.reduce((a, b) => a + b, 0);
  let distance = 0;
  let time = 2;
  route.slice(1).forEach((point, index) => {
    const duration = lengths[index] / total * 1.43;
    distance += lengths[index];
    tl.to(pose, { headX: point[0], penY: point[1], plan: distance / total, duration, ease: 'none' }, time);
    time += duration;
  });
  tl.to(pose, { gauge: proposal.gauge, wheel: proposal.wheel, duration: .7 }, 2.75);
  tl.set(pose, { ...proposal }, 3.5);
  tl.addLabel('proposition', 3.5);

  // The driver first grips the stored frame's back bridge. Its tip stays flush while lifting,
  // transferring and lowering, so the frame is held by the gantry throughout the entire journey.
  const supplyDriverY = layout.supplyY - 32.5;
  tl.to(pose, { penDrop: 0, duration: .2 }, 3.5);
  tl.to(pose, { headX: layout.supplyX - 14, driverY: supplyDriverY, penY: -45, probeY: -55, duration: .42 }, 3.62);
  tl.to(pose, { projectX: build.projectX, sort: 0, duration: .5 }, 3.6);
  tl.to(pose, { driverDrop: 13, duration: .2 }, 4.04);
  tl.to(pose, { coverLift: 54, driverDrop: -40, duration: .28 }, 4.24);
  tl.to(pose, { headX: build.headX, driverY: -32.5, coverX: build.coverX, coverY: 0, duration: .43 }, 4.52);
  tl.to(pose, { coverLift: 0, driverDrop: 14, duration: .35 }, 4.95);
  tl.to(pose, { clamp: 1, duration: .25 }, 5.3);
  tl.to(pose, { driverDrop: 0, duration: .17 }, 5.3);
  tl.to(pose, { driverY: 0, penY: 0, probeY: 0, duration: .15 }, 5.47);
  tl.to(pose, { driverDrop: 29.9, duration: .14 }, 5.62);
  tl.to(pose, { driverDrop: build.driverDrop, gauge: build.gauge, wheel: build.wheel, duration: .14 }, 5.76);
  tl.set(pose, { ...build }, 5.9);
  tl.addLabel('implantation', 5.9);

  // The calibration key slides into engagement, makes one adjustment, and holds steady.
  tl.to(pose, { service: 1, duration: .44 }, 5.9);
  tl.to(pose, { adjustment: 1, gauge: .69, driverDrop: 28, duration: .5 }, 6.3);
  tl.to(pose, { gauge: maintain.gauge, driverDrop: maintain.driverDrop, wheel: maintain.wheel, duration: .48 }, 6.8);
  tl.set(pose, { ...maintain }, 7.3);
  tl.addLabel('maintenance', 7.3);
  return tl;
}
