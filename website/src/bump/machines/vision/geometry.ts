import * as Anatomy from '../../anatomy/kit/iso-kit';
import { createVisionGeometry } from './geometry-source.mjs';
import keys from './depth-keys.json';

// Native Anatomy projection / extrusion, computed once. No WebGL and no per-frame React art.
export const VISION_DESKTOP = createVisionGeometry(Anatomy, false);
export const VISION_MOBILE = createVisionGeometry(Anatomy, true);
for (const [geometry, map] of [[VISION_DESKTOP, keys.desktop], [VISION_MOBILE, keys.mobile]] as const) {
  for (const part of geometry.parts) if (map[part.id] !== undefined) part.key = map[part.id];
}
