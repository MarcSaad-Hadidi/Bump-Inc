import React from 'react';
import { VISION_DESKTOP, VISION_MOBILE } from './geometry';
import { gearFrame, poseAt, worldOffset, depthOffset } from './geometry-source.mjs';

function Solid({ part, paths, transform }: any) {
  return <g data-vision-part={part.id} data-material={part.material} data-key={part.key} className="iso-solid bvs-solid" transform={transform}>
    <path className="iso-fill" data-path="fill" d={paths.fill} />
    {paths.shades.map((d: string, i: number) => <path key={i} className="iso-shade" data-path={`shade-${i}`} data-shade={i} d={d} />)}
    <path className="iso-top" data-path="top" d={paths.top} />
    <path className="iso-line iso-crease" data-path="crease" data-tone="faint" d={paths.crease} />
    <path className="iso-line iso-bevel" data-path="bevel" data-tone="faint" d={paths.bevel || ''} />
    {part.detail.map((line: any, i: number) => <path key={i} className="iso-line bvs-detail" data-tone={line.tone} d={line.d} />)}
    <path className="iso-line iso-edge" data-path="outline" data-tone="mid" d={paths.outline} />
  </g>;
}

export function VisionAssembly({ mobile = false, titleId }: { mobile?: boolean; titleId: string }) {
  const geometry = mobile ? VISION_MOBILE : VISION_DESKTOP;
  const pose = poseAt(0, geometry.config);
  const ordered = geometry.parts.map((part: any) => ({ part, offset: worldOffset(part, pose) }))
    .sort((a: any, b: any) => a.part.key + depthOffset(a.part,pose,geometry) - b.part.key - depthOffset(b.part,pose,geometry));
  return <svg className={`bvs-svg bvs-svg--${mobile ? 'mobile' : 'desktop'} iso-svg`} data-vision-scene={mobile ? 'mobile' : 'desktop'} viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="img" aria-labelledby={titleId}>
    <title id={titleId}>Trois mécanismes indépendants s’alignent autour d’un même axe de coordination.</title>
    <desc>Une sculpture ivoire et laiton sur un socle. À mesure de la progression, trois axes se rapprochent d’un engrenage vert et tous tournent ensemble.</desc>
    <path className="bvs-ground-shadow" d={geometry.floorShadow} />
    <g data-vision-parts="">
      {ordered.map(({ part, offset }: any) => {
        const xy = geometry.translate(offset);
        const paths = part.shape.kind === 'geartooth'
          ? geometry.gearFrames.get(`${part.shape.teeth}:${part.shape.tooth}`)[gearFrame(pose.phases[part.group] || 0, part.shape.teeth)]
          : part.paths;
        return <Solid key={part.id} part={part} paths={paths} transform={`translate(${xy[0]} ${xy[1]})`} />;
      })}
    </g>
  </svg>;
}
