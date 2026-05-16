export const HUB_BG_FRAG = /* glsl */ `
precision mediump float;

uniform float time;
uniform vec2 resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec3 deep   = vec3(0.04, 0.03, 0.10);
  vec3 mid    = vec3(0.18, 0.10, 0.32);
  vec3 accent = vec3(0.42, 0.20, 0.65);

  float wave = sin(time * 0.25 + uv.x * 4.0) * 0.04;
  float y    = clamp(uv.y + wave, 0.0, 1.0);

  vec3 color = mix(deep, mid, smoothstep(0.0, 0.6, y));
  color      = mix(color, accent, smoothstep(0.7, 1.0, y));

  float grain = (hash(gl_FragCoord.xy + time * 60.0) - 0.5) * 0.025;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;
