// time, resolution: auto-injected by Phaser BaseShader
// uColorDeep/uColorMid/uColorAccent: 0-1 normalized RGB; set per-room via RoomPalette
// uWaveSpeed: cycles/sec horizontal wave; uWaveAmplitude: max vertical UV offset
// uGrainStrength: 0 = no grain, ~0.03 = subtle film noise

precision mediump float;

uniform float time;
uniform vec2  resolution;
uniform vec3  uColorDeep;
uniform vec3  uColorMid;
uniform vec3  uColorAccent;
uniform float uWaveSpeed;
uniform float uWaveAmplitude;
uniform float uGrainStrength;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  float wave = sin(time * uWaveSpeed + uv.x * 4.0) * uWaveAmplitude;
  float y    = clamp(uv.y + wave, 0.0, 1.0);

  vec3 color = mix(uColorDeep, uColorMid, smoothstep(0.0, 0.6, y));
  color      = mix(color, uColorAccent, smoothstep(0.7, 1.0, y));

  float grain = (hash(gl_FragCoord.xy + time * 60.0) - 0.5) * uGrainStrength;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
