// One visible paper colour for the native wipe, its settled frame and CSS.
// Shader uniforms are linear; a direct drawing-buffer clear is already sRGB.
export const BUMP_PAPER_CSS='#f4f1e8';
export const BUMP_PAPER_SRGB=[244/255,241/255,232/255];
export const BUMP_PAPER_LINEAR=BUMP_PAPER_SRGB.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);

export function drawBumpPaper(renderer,savedColor){
 const savedAlpha=renderer.getClearAlpha();
 renderer.getClearColor(savedColor);
 renderer.setRenderTarget(null);
 renderer.state.buffers.color.setMask(true);
 renderer.setClearColor(BUMP_PAPER_CSS,1);
 renderer.clear(true,false,false);
 // Restore the native state before the next scene's render-target clear.
 renderer.setClearColor(savedColor,savedAlpha);
}
