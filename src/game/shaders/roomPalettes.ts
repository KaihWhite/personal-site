export interface RoomPalette {
  deep:           [number, number, number];
  mid:            [number, number, number];
  accent:         [number, number, number];
  waveSpeed:      number;
  waveAmplitude:  number;
  grainStrength:  number;
}

export const HUB_PALETTE: RoomPalette = {
  deep:           [0.04, 0.03, 0.10], // near-black violet
  mid:            [0.18, 0.10, 0.32], // dark purple
  accent:         [0.42, 0.20, 0.65], // bright violet
  waveSpeed:      0.25,
  waveAmplitude:  0.04,
  grainStrength:  0.025,
};

export const PORTFOLIO_PALETTE: RoomPalette = {
  deep:           [0.10, 0.06, 0.04], // near-black amber
  mid:            [0.32, 0.18, 0.10], // dark sienna
  accent:         [0.65, 0.40, 0.20], // warm amber
  waveSpeed:      0.20,
  waveAmplitude:  0.05,
  grainStrength:  0.025,
};

export const ABOUT_PALETTE: RoomPalette = {
  deep:           [0.04, 0.08, 0.10], // near-black teal
  mid:            [0.12, 0.22, 0.28], // dark slate blue
  accent:         [0.30, 0.50, 0.60], // muted cyan
  waveSpeed:      0.10,
  waveAmplitude:  0.02,
  grainStrength:  0.020,
};

export const CONTACT_PALETTE: RoomPalette = {
  deep:           [0.06, 0.06, 0.08], // near-black grey
  mid:            [0.16, 0.16, 0.20], // cool dark grey
  accent:         [0.45, 0.45, 0.55], // muted lavender grey
  waveSpeed:      0.05,
  waveAmplitude:  0.015,
  grainStrength:  0.020,
};

export const CORRIDOR_PALETTE: RoomPalette = {
  deep:           [0.05, 0.05, 0.08], // near-black indigo
  mid:            [0.15, 0.15, 0.22], // dark desaturated indigo
  accent:         [0.35, 0.30, 0.45], // muted mauve
  waveSpeed:      0.15,
  waveAmplitude:  0.025,
  grainStrength:  0.030,
};
