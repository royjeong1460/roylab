// Presentation only. Material IDs retain their simulation meaning.
export const tones = [0, '#96714d', '#ee8245', '#d7ac62', '#6995a0', '#c47d6b'];
export const palette = tones.map(color => color ? Number.parseInt(color.slice(1), 16) : 0);
export const worldTheme = {
  background: '#e5ecdd',
  backgroundColor: 0xe5ecdd,
  grid: 0x496d54,
  floorEdge: 0x415f51,
  floor: 0xc9d5bb,
  grainHighlight: '#ffffff20',
  scar: '#553a2c',
  brokenCrack: '#f3bf78',
  minimapBackground: '#dae4cb',
  minimapFloor: '#71886b',
  minimapViewport: '#ed7c40',
  previewFloor: '#819572',
};
