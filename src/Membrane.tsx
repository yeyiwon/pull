import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Plane, Raycaster, Vector2, Vector3, Vector4 } from 'three'

const RIPPLE_COUNT = 4

const vertexShader = /* glsl */ `
  varying vec2 vPoint;
  void main() {
    vPoint = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uInfluence;
  uniform vec4 uRipples[4];
  varying vec2 vPoint;

  vec2 restPoint(vec2 p) {
    vec2 offset = uPointer - p;
    float reach = exp(-dot(offset, offset) / 0.85);
    return p - offset * reach * uInfluence * 0.26;
  }

  float outline(vec2 p) {
    vec2 q = restPoint(p) / vec2(1.38, 1.1);
    float angle = atan(q.y, q.x);
    float edge = 1.0 + 0.09 * sin(angle * 3.0 + uTime * 0.12)
      + 0.055 * cos(angle * 2.0 - uTime * 0.09);
    return length(q) - edge;
  }

  float heightAt(vec2 p) {
    vec2 q = restPoint(p);
    float height = 0.11 * sin(q.x * 2.4 + uTime * 0.18)
      * cos(q.y * 2.1 - uTime * 0.13)
      + 0.065 * sin(q.x * 3.5 + q.y * 1.7 - uTime * 0.15);
    vec2 offset = p - uPointer;
    height += 0.22 * uInfluence * exp(-dot(offset, offset) / 0.6);
    for (int i = 0; i < 4; i++) {
      float age = uTime - uRipples[i].z;
      float distanceToClick = length(p - uRipples[i].xy);
      float front = distanceToClick - age * 0.65;
      float envelope = exp(-front * front / 0.11) * exp(-age * 0.38);
      float onset = smoothstep(0.0, 0.3, age);
      height += 0.085 * sin(front * 10.0) * envelope * onset * uRipples[i].w;
    }
    return height;
  }

  void main() {
    float edge = outline(vPoint);
    float coverage = 1.0 - smoothstep(-0.012, 0.012, edge);
    if (coverage < 0.001) discard;

    // A continuous height field gives the single membrane soft surface shading.
    float epsilon = 0.008;
    float dx = (heightAt(vPoint + vec2(epsilon, 0.0))
      - heightAt(vPoint - vec2(epsilon, 0.0))) / (2.0 * epsilon);
    float dy = (heightAt(vPoint + vec2(0.0, epsilon))
      - heightAt(vPoint - vec2(0.0, epsilon))) / (2.0 * epsilon);
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    vec3 light = normalize(vec3(-0.55, 0.7, 0.5));
    float diffuse = max(dot(normal, light), 0.0);
    float sheen = pow(max(dot(normal, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 22.0);
    float fold = exp(-abs(edge + 0.065) * 30.0);
    float touch = exp(-dot(vPoint - uPointer, vPoint - uPointer) / 0.45) * uInfluence;
    vec3 color = vec3(0.026, 0.038, 0.041);
    color += vec3(0.035, 0.048, 0.049) * diffuse;
    color += vec3(0.028, 0.035, 0.033) * sheen;
    color += vec3(0.015, 0.022, 0.023) * fold;
    color += vec3(0.035, 0.045, 0.039) * touch;
    // Fade the boundary into the dark space instead of a bright outline.
    color *= 0.7 + 0.3 * smoothstep(0.0, 0.22, -edge);
    gl_FragColor = vec4(color, coverage);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function Membrane() {
  const { gl, camera, viewport } = useThree()
  // Keep the same quiet composition in landscape and portrait viewports.
  const scale = Math.min(viewport.width, viewport.height) / 6.5
  const uniforms = useMemo(() => ({
      uTime: { value: 0 },
      uPointer: { value: new Vector2() },
      uInfluence: { value: 0 },
      uRipples: { value: Array.from({ length: RIPPLE_COUNT }, () => new Vector4(0, 0, 0, 0)) },
  }), [])
  const stateRef = useRef({
    pointer: new Vector2(),
    target: new Vector2(),
    hit: new Vector3(),
    plane: new Plane(new Vector3(0, 0, 1), 0),
    raycaster: new Raycaster(),
    active: false,
    nextRipple: 0,
    uniforms,
  })

  useEffect(() => {
    const state = stateRef.current
    const canvas = gl.domElement
    function move(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect()
      state.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2,
      )
      state.active = true
    }
    function locate() {
      state.raycaster.setFromCamera(state.pointer, camera)
      if (state.raycaster.ray.intersectPlane(state.plane, state.hit)) {
        state.target.set(state.hit.x / scale, state.hit.y / scale)
      }
    }
    function click(event: MouseEvent) {
      if (event.button !== 0) return
      const rect = canvas.getBoundingClientRect()
      state.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2)
      locate()
      // Match the shader silhouette so empty-space clicks do not trigger waves.
      const pointer = state.uniforms.uPointer.value
      const x = state.target.x
      const y = state.target.y
      const dx = pointer.x - x
      const dy = pointer.y - y
      const pull = Math.exp(-(dx * dx + dy * dy) / 0.85) * state.uniforms.uInfluence.value * 0.26
      const qx = (x - dx * pull) / 1.38
      const qy = (y - dy * pull) / 1.1
      const angle = Math.atan2(qy, qx)
      const time = state.uniforms.uTime.value
      const edge = 1 + 0.09 * Math.sin(angle * 3 + time * 0.12)
        + 0.055 * Math.cos(angle * 2 - time * 0.09)
      if (Math.hypot(qx, qy) > edge) return
      state.uniforms.uRipples.value[state.nextRipple].set(x, y, time, 1)
      state.nextRipple = (state.nextRipple + 1) % RIPPLE_COUNT
    }
    function leave() { state.active = false }
    function release(event: PointerEvent) {
      if (event.pointerType !== 'mouse') leave()
    }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerdown', move)
    canvas.addEventListener('click', click)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('pointercancel', leave)
    canvas.addEventListener('pointerup', release)
    window.addEventListener('blur', leave)
    return () => {
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerdown', move)
      canvas.removeEventListener('click', click)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('pointercancel', leave)
      canvas.removeEventListener('pointerup', release)
      window.removeEventListener('blur', leave)
    }
  }, [camera, gl, scale])

  useFrame((_, delta) => {
    const state = stateRef.current
    const dt = Math.min(delta, 0.05)
    const uniforms = state.uniforms
    uniforms.uTime.value += dt
    state.raycaster.setFromCamera(state.pointer, camera)
    if (state.raycaster.ray.intersectPlane(state.plane, state.hit)) {
      state.target.set(state.hit.x / scale, state.hit.y / scale)
    }
    const distance = Math.hypot(state.target.x / 1.38, state.target.y / 1.1)
    const influence = state.active ? Math.max(0, Math.min(1, (1.9 - distance) / 0.7)) : 0
    // Freeze the last contact position on exit so the deformation gently relaxes there.
    if (influence > 0) uniforms.uPointer.value.lerp(state.target, 1 - Math.exp(-2.2 * dt))
    const rate = influence > uniforms.uInfluence.value ? 1.8 : 0.75
    uniforms.uInfluence.value += (influence - uniforms.uInfluence.value) * (1 - Math.exp(-rate * dt))
  })

  return (
    <mesh scale={scale}>
      <planeGeometry args={[5, 5]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

export default Membrane
