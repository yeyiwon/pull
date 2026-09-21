import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Fog, HemisphereLight, Mesh, MeshStandardMaterial, Vector3, BackSide, BufferGeometry, Color, DirectionalLight, DoubleSide, Float32BufferAttribute, Group, PlaneGeometry, SphereGeometry, UniformsLib, UniformsUtils } from 'three'
import { worldTime } from './worldTime.ts'
import BloomGarden, { Flower } from './BloomGarden.tsx'
import { RIDGES, ROCKS, RING } from './worldLayout.ts'
import type { Player } from './locomotion.ts'
import { skyVertex, skyFragment, waterVertex, waterFragment } from './environmentShaders.ts'

function setUniform(uniform: { value: number }, value: number) { uniform.value = value }
function updateGlow(material: MeshStandardMaterial, target: number, smooth: number) { material.emissiveIntensity += (target - material.emissiveIntensity) * smooth }

// Deterministic broad folds give silhouettes structure without external maps.
function landform() {
  const geometry = new SphereGeometry(1, 48, 28)
  const p = geometry.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const fold = 1 + 0.14 * Math.sin(x * 8 + z * 3) + 0.08 * Math.cos(z * 9 - y * 5)
    p.setXYZ(i, x * fold, y * (1 + 0.16 * Math.sin(x * 7 + z * 5)), z * fold)
  }
  geometry.computeVertexNormals()
  return geometry
}

function Environment({ player }: { player: RefObject<Player> }) {
  const { scene } = useThree()
  const hemisphere = useRef<HemisphereLight>(null)
  const glowMaterials = useRef<{ material: MeshStandardMaterial; base: number }[]>([])
  const tint = useMemo(() => ({ a: new Color(), b: new Color(), sun: new Vector3() }), [])
  useEffect(() => {
    const seen = new Set<MeshStandardMaterial>()
    scene.traverse(o => {
      if (!(o instanceof Mesh)) return
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        if (material instanceof MeshStandardMaterial && material.emissiveIntensity > 0 && material.emissive.getHex() !== 0 && !seen.has(material)) {
          seen.add(material); glowMaterials.current.push({ material, base: material.emissiveIntensity })
        }
      }
    })
    return () => { glowMaterials.current.forEach(({ material, base }) => { material.emissiveIntensity = base }); glowMaterials.current = [] }
  }, [scene])
  const light = useRef<DirectionalLight>(null)
  const islands = useRef<Group>(null)
  const plants = useRef<Group>(null)
  const resources = useMemo(() => {
    const rock = landform()
    const floor = new PlaneGeometry(700, 700, 100, 100)
    const colors = new Float32Array(floor.attributes.position.count * 3)
    const base = new Color('#368f85'), alternate = new Color('#8bb578'), c = new Color()
    for (let i = 0; i < floor.attributes.position.count; i++) {
      const x = floor.attributes.position.getX(i), z = floor.attributes.position.getY(i)
      const patch = (Math.sin(x * 0.09 + Math.sin(z * 0.05) * 3) + Math.cos(z * 0.12 + x * 0.04)) * 0.14 + 0.45
      c.copy(base).lerp(alternate, patch).toArray(colors, i * 3)
    }
    floor.setAttribute('color', new Float32BufferAttribute(colors, 3))
    const positions: number[] = [], uv: number[] = [], indices: number[] = []
    for (let i = 0; i <= 200; i++) {
      const z = -180 + i * 1.8
      const x = 6 + Math.sin(z * 0.039) * 14 + Math.sin(z * 0.081) * 3
      const width = 3.4 + Math.sin(z * 0.03) * 1.4
      positions.push(x - width, 0.035, z, x + width, 0.035, z)
      uv.push(0, i / 200, 1, i / 200)
      if (i < 200) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    }
    const stream = new BufferGeometry()
    stream.setAttribute('position', new Float32BufferAttribute(positions, 3))
    stream.setAttribute('uv', new Float32BufferAttribute(uv, 2)); stream.setIndex(indices)
    stream.computeVertexNormals()
    return { rock, floor, stream, sky: { uTime: { value: 0 }, uTop: { value: new Color('#3787ce') }, uHorizon: { value: new Color('#a8dfed') }, uSunDirection: { value: new Vector3(-1, 0, -.4).normalize() }, uDay: { value: 1 } }, water: UniformsUtils.merge([UniformsLib.fog, { uTime: { value: 0 }, uGlow: { value: 1 } }]) }
  }, [])
  useEffect(() => () => {
    resources.rock.dispose(); resources.floor.dispose(); resources.stream.dispose()
  }, [resources])
  useFrame((_, delta) => {
    setUniform(resources.sky.uTime, resources.sky.uTime.value + delta)
    setUniform(resources.water.uTime, resources.water.uTime.value + delta)
    const { from, to, blend, sunX, sunY, daylight } = worldTime.current
    const smooth = 1 - Math.exp(-delta * 2)
    const sky = resources.sky
    tint.a.set(from.top).lerp(tint.b.set(to.top), blend); sky.uTop.value.lerp(tint.a, smooth)
    tint.a.set(from.horizon).lerp(tint.b.set(to.horizon), blend); sky.uHorizon.value.lerp(tint.a, smooth)
    tint.sun.set(sunX, sunY, -.4).normalize()
    sky.uSunDirection.value.lerp(tint.sun, smooth).normalize()
    setUniform(sky.uDay, sky.uDay.value + (daylight - sky.uDay.value) * smooth)
    if (scene.fog instanceof Fog) {
      tint.a.set(from.fog).lerp(tint.b.set(to.fog), blend); scene.fog.color.lerp(tint.a, smooth)
    }
    if (hemisphere.current) {
      hemisphere.current.intensity += (MathUtils.lerp(from.ambient, to.ambient, blend) - hemisphere.current.intensity) * smooth
      hemisphere.current.color.copy(sky.uHorizon.value)
    }
    const glow = MathUtils.lerp(from.glow, to.glow, blend)
    setUniform(resources.water.uGlow, resources.water.uGlow.value + (glow - resources.water.uGlow.value) * smooth)
    for (const { material, base } of glowMaterials.current) updateGlow(material, base * glow, smooth)
    if (light.current) {
      tint.a.set(from.light).lerp(tint.b.set(to.light), blend); light.current.color.lerp(tint.a, smooth)
      light.current.intensity += (MathUtils.lerp(from.intensity, to.intensity, blend) - light.current.intensity) * smooth
    }
    const t = resources.sky.uTime.value
    if (islands.current) for (let i = 0; i < islands.current.children.length; i++) {
      const child = islands.current.children[i]
      child.position.y = Math.sin(t * 0.09 + i * 2) * 0.35
      child.rotation.y = Math.sin(t * 0.025 + i) * 0.025
    }
    if (plants.current) for (let i = 0; i < plants.current.children.length; i++) {
      plants.current.children[i].rotation.z = Math.sin(t * 0.35 + i * 1.7) * 0.035
    }
    if (!light.current) return
    const { x, z } = player.current.position
    // Shadow volume follows the player; light direction matches the celestial body.
    const direction = sky.uSunDirection.value
    const sign = sky.uDay.value * 2 - 1
    tint.sun.set(x + direction.x * 45 * sign, Math.max(3, Math.abs(direction.y) * 45), z + direction.z * 45 * sign)
    light.current.position.lerp(tint.sun, smooth)
    light.current.target.position.set(x, 0, z)
    light.current.target.updateMatrixWorld()
  })
  return (
    <>
      <fog attach="fog" args={['#c7dce9', 75, 290]} />
      <mesh renderOrder={-1}>
        <sphereGeometry args={[450, 48, 24]} />
        <shaderMaterial uniforms={resources.sky} vertexShader={skyVertex} fragmentShader={skyFragment} side={BackSide} depthWrite={false} />
      </mesh>
      <hemisphereLight ref={hemisphere} args={['#e6f2ff', '#648d98', 1.35]} />
      <directionalLight ref={light} intensity={1.25} color="#fff0d7" castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14}
        shadow-camera-far={85} shadow-normalBias={0.035} shadow-bias={-0.0001} />
      <mesh geometry={resources.floor} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.88} metalness={0.025} />
      </mesh>
      <mesh geometry={resources.stream} renderOrder={1}>
        <shaderMaterial uniforms={resources.water} vertexShader={waterVertex} fragmentShader={waterFragment}
          transparent depthWrite={false} side={DoubleSide} fog />
      </mesh>
      {/* Far ridges overlap the middle islands, leaving a valley toward the aperture. */}
      {RIDGES.map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={i} geometry={resources.rock} position={[x, y, z]} scale={[sx, sy, sz]} rotation={[0, i * 0.3, 0]}>
          <meshStandardMaterial color={i < 5 ? '#a4a9e1' : '#7e8ccb'} roughness={0.93} />
        </mesh>
      ))}
      <group ref={islands}>
        {[
          [-36, 19, -85, 13, 4, 9], [64, 27, -133, 18, 6, 11], [-92, 24, 42, 18, 7, 12],
        ].map(([x, y, z, sx, sy, sz], i) => (
          <group key={i}>
            <mesh geometry={resources.rock} position={[x, y, z]} scale={[sx, sy, sz]} rotation={[0.2, i * 1.4, -0.16 + i * 0.13]}>
              <meshStandardMaterial color="#a9d9ca" roughness={0.87} />
            </mesh>
            <mesh geometry={resources.rock} position={[x + 2, y - 4, z]} scale={[sx * 0.55, sy * 1.5, sz * 0.55]} rotation={[0, i, 0.25]}>
              <meshStandardMaterial color="#8b8dc5" roughness={0.95} />
            </mesh>
            {i < 2 && <mesh position={[x + sx * .5, y - 10, z]} scale={[.7, 14, .45]}>
              <cylinderGeometry args={[.65, .12, 1, 12, 1, true]} />
              <meshStandardMaterial color="#adf6ee" emissive="#75dfed" emissiveIntensity={.45} transparent opacity={.45} depthWrite={false} />
            </mesh>}
            {i < 2 && <group position={[x, y + sy, z]}><Flower scale={i === 0 ? 1.7 : 2.2} /></group>}
          </group>
        ))}
      </group>
      <mesh position={[RING.x, RING.y, RING.z]} rotation={[0, RING.yaw, RING.tilt]} scale={[1, 1.2, 0.65]} castShadow>
        <torusGeometry args={[RING.radius, RING.tube, 24, 96]} />
        <meshStandardMaterial color="#ffe9ce" emissive="#f1aabf" emissiveIntensity={0.32} roughness={0.48} metalness={0.18} />
      </mesh>
      {ROCKS.map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={i} geometry={resources.rock} position={[x, y, z]} scale={[sx, sy, sz]} rotation={[0, i * 0.7, 0.12]} castShadow receiveShadow>
          <meshStandardMaterial color="#aaabd4" roughness={0.8} />
        </mesh>
      ))}
      <BloomGarden />
      <group ref={plants}>
        {[[7, -12, 1], [-17, -26, 1.4], [-8, 12, 0.8], [29, 7, 1.2], [-30, -48, 1]].map(([x, z, scale], i) => (
          <group key={i} position={[x, 0, z]} scale={scale}>
            {[0, 1, 2].map((n) => (
              <group key={n} position={[n * 0.55, 0, Math.sin(n * 2) * 0.5]} rotation={[0, n * 1.5 + i, 0.13 * (n - 1)]} scale={1 - n * 0.18}>
                <mesh position={[0.12, 1, 0]} rotation={[0, 0, -0.12]} castShadow>
                  <cylinderGeometry args={[0.035, 0.08, 2, 7]} />
                  <meshStandardMaterial color="#74b5bd" roughness={0.86} />
                </mesh>
                <mesh position={[0.23, 2.05, 0]} scale={[0.47, 0.19, 0.28]} rotation={[0, 0, 0.3]}>
                  <sphereGeometry args={[1, 16, 10]} />
                  <meshStandardMaterial color="#e8b5e7" emissive="#d69bd3" emissiveIntensity={0.3} roughness={0.6} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
        {[[4, 6], [-7, -8], [18, -22], [-20, 24]].map(([x, z], i) => (
          <group key={`petal-${i}`} position={[x, 0, z]} rotation={[0, i, 0]}>
            {[0, 1, 2, 3].map(n => (
              <mesh key={n} position={[Math.sin(n * 2) * 0.3, 0.5, Math.cos(n * 2) * 0.3]} scale={[0.25, 1 + n * 0.12, 0.08]}
                rotation={[0.25, n * 2, (n - 1.5) * 0.35]}>
                <sphereGeometry args={[1, 12, 10]} />
                <meshStandardMaterial color="#98ddd5" roughness={0.63} metalness={0.08} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </>
  )
}
export default Environment
