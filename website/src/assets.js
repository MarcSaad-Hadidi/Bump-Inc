import content from './content.json';
export { content };
export const asset = (key) => content.assets[key] ? `/assets/${content.assets[key].path}` : '';
export const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

export const imageDimensions = key => ({width:content.assets[key]?.width,height:content.assets[key]?.height});
