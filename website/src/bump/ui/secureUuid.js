// Render/cache identifiers keep their UUIDv4 contract without depending on the
// visual animation PRNG. getRandomValues also works on ordinary HTTP previews.
export function createRendererUuid() {
  const generator = globalThis.crypto;
  if (typeof generator?.getRandomValues !== 'function') {
    throw new Error('A secure random generator is required for render identifiers');
  }
  const bytes = new Uint8Array(16);
  generator.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
  return hex.slice(0, 4).join('') + '-' + hex.slice(4, 6).join('') + '-' +
    hex.slice(6, 8).join('') + '-' + hex.slice(8, 10).join('') + '-' + hex.slice(10).join('');
}
