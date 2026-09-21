export const skyVertex = `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

export const skyFragment = `
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDirection;
uniform float uDay;
varying vec3 vDirection;
float haze(vec3 p) {
  return sin(p.x * 2.1 + sin(p.z * 1.4)) * sin(p.z * 1.8 + p.y * 2.0);
}
void main() {
  vec3 d = normalize(vDirection);
  vec3 horizon = uHorizon;
  vec3 night = uTop;
  float height = pow(max(d.y, 0.0), 0.32);
  vec3 color = mix(horizon, night, height);
  color += vec3(0.16, 0.025, 0.07) * exp(-pow((d.y - 0.2) * 4.0, 2.0));
  float bands = haze(d * 7.0 + vec3(uTime * 0.003, 0.0, 0.0));
  bands += haze(d * 15.0) * 0.3;
  float cloud = smoothstep(0.05, 1.2, bands) * smoothstep(0.0, 0.08, d.y);
  color += vec3(0.22, 0.19, 0.22) * cloud * exp(-d.y * 3.5);
  // Two angular scales move independently, separating high wisps from horizon haze.
  float highCloud = smoothstep(0.35, 1.1, haze(d * 11.0 + vec3(0.0, uTime * .001, uTime * .004)));
  color = mix(color, vec3(.82, .88, .96), highCloud * smoothstep(.18, .55, d.y) * .25);
  vec3 moonDir = -uSunDirection;
  float angular = length(d - moonDir);
  float moon = 1.0 - smoothstep(0.105, 0.118, angular);
  float halo = exp(-angular * angular * 30.0);
  float phase = smoothstep(-0.1, 0.12, dot(d - moonDir, vec3(-0.8, 0.4, 0.0)));
  color += vec3(0.2, 0.16, 0.21) * halo * (1.0 - uDay);
  color = mix(color, vec3(0.95, 0.84, 0.69) * (0.6 + phase * 0.4), moon * (0.62 - cloud * 0.16) * (1.0 - uDay));
  float sunAngle = length(d - uSunDirection);
  float sun = 1.0 - smoothstep(.032, .049, sunAngle);
  color += vec3(.85, .5, .21) * exp(-sunAngle * sunAngle * 100.0) * uDay * .3;
  color = mix(color, vec3(1.0, .85, .57), sun * uDay * .8);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export const waterVertex = `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
export const waterFragment = `
uniform float uTime;
uniform float uGlow;
varying vec2 vUv;
#include <fog_pars_fragment>
void main() {
  float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(0.0, 0.15, 1.0 - vUv.x);
  float wave = sin(vUv.y * 310.0 + sin(vUv.x * 15.0 + uTime * 0.17) * 2.0 - uTime * 0.24);
  float shimmer = pow(max(0.0, wave), 14.0) * 0.12;
  vec3 color = mix(vec3(0.07, 0.4, 0.48), vec3(0.35, 0.75, 0.69), vUv.x);
  color *= .75 + uGlow * .25;
  color += shimmer * vec3(0.5, 0.6, 0.7);
  gl_FragColor = vec4(color, edge * 0.78);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`
