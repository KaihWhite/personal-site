export interface RoomPalette {
  deep:           [number, number, number];
  mid:            [number, number, number];
  accent:         [number, number, number];
  waveSpeed:      number;
  waveAmplitude:  number;
  grainStrength:  number;
}

export const HUB_PALETTE: RoomPalette = {
  deep:           [0.04, 0.03, 0.10],
  mid:            [0.18, 0.10, 0.32],
  accent:         [0.42, 0.20, 0.65],
  waveSpeed:      0.25,
  waveAmplitude:  0.04,
  grainStrength:  0.025,
};

export const PORTFOLIO_PALETTE: RoomPalette = {
  deep:           [0.10, 0.06, 0.04],
  mid:            [0.32, 0.18, 0.10],
  accent:         [0.65, 0.40, 0.20],
  waveSpeed:      0.20,
  waveAmplitude:  0.05,
  grainStrength:  0.025,
};

export const ABOUT_PALETTE: RoomPalette = {
  deep:           [0.04, 0.08, 0.10],
  mid:            [0.12, 0.22, 0.28],
  accent:         [0.30, 0.50, 0.60],
  waveSpeed:      0.10,
  waveAmplitude:  0.02,
  grainStrength:  0.020,
};

export const CONTACT_PALETTE: RoomPalette = {
  deep:           [0.06, 0.06, 0.08],
  mid:            [0.16, 0.16, 0.20],
  accent:         [0.45, 0.45, 0.55],
  waveSpeed:      0.05,
  waveAmplitude:  0.015,
  grainStrength:  0.020,
};

export const CORRIDOR_PALETTE: RoomPalette = {
  deep:           [0.05, 0.05, 0.08],
  mid:            [0.15, 0.15, 0.22],
  accent:         [0.35, 0.30, 0.45],
  waveSpeed:      0.15,
  waveAmplitude:  0.025,
  grainStrength:  0.030,
};
