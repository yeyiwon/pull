import { NIGHT_TUNING } from '../graphics/nightTuning.ts'
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, ShaderMaterial, Fog, HemisphereLight, Mesh, MeshStandardMaterial, Vector3, BackSide, Color, DirectionalLight, Float32BufferAttribute, Group, PlaneGeometry, SphereGeometry } from 'three'
import { graphicsState, QUALITY, useQuality } from '../graphics/quality.ts'
import { meadowDetail } from '../graphics/materialDetail.ts'
import WorldHalo from '../graphics/WorldHalo.tsx'
import ContactDepth from '../graphics/ContactDepth.tsx'
import WorldAccents from './WorldAccents.tsx'
import RiverbankArt from './RiverbankArt.tsx'
import { weatheredStone, leafBlade } from './artGeometry.ts'
import { artMaterial, updateArtMaterial } from '../graphics/artMaterial.ts'
import HomeCraft from './HomeCraft.tsx'
import FantasyGrove from './FantasyGrove.tsx'
import HeroMeadow from '../environment/HeroMeadow.tsx'
import ProceduralLakePark from './ProceduralLakePark.tsx'
import WinterTree from './WinterTree.tsx'
import Waterway from './Waterway.tsx'
import { riverbedHeight } from './terrain.ts'
import MoruHome from './MoruHome.tsx'
import SeasonalDetails from './SeasonalDetails.tsx'
import { environmentState as env, updateEnvironmentState } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import BloomGarden, { Flower } from './BloomGarden.tsx'
import { RIDGES, ROCKS } from './worldLayout.ts'
import type { EnvironmentArtSlots } from './artSlots.ts'
import type { Player } from './locomotion.ts'
import { skyVertex, skyFragment } from './environmentShaders.ts'
import { getRendererMode,useRendererMode } from '../graphics/rendererV2.ts'

function setFogRange(fog: Fog, haze: number) { fog.near = 38 / haze; fog.far = 285 / haze }
function setUniform(uniform: { value: number }, value: number) { uniform.value = value }
function updateGlow(material: MeshStandardMaterial, target: number, smooth: number) { material.emissiveIntensity += (target - material.emissiveIntensity) * smooth }
function v2NightShadowRadius(night:number,v2:boolean){return v2?MathUtils.lerp(3,8,night):3}

// Deterministic broad folds give silhouettes structure without external maps.
function landform() {
  const geometry = new SphereGeometry(1, 48, 28)
  const p = geometry.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const fold = 1 + 0.14 * Math.sin(x * 8 + z * 3) + 0.08 * Math.cos(z * 9 - y * 5)
    p.setXYZ(i, x * fold, y * (1 + 0.26 * Math.sin(x * 7 + z * 5)) + Math.max(0,y) * .12 * Math.sin(x*14+z*6), z * fold)
  }
  geometry.computeVertexNormals()
  return geometry
}

function Environment({ player, art = {} }: { player: RefObject<Player>; art?: EnvironmentArtSlots }) {
  const { scene } = useThree()
  const quality=useQuality(), preset=QUALITY[quality],rendererMode=useRendererMode()
  const hemisphere = useRef<HemisphereLight>(null)
  const glowMaterials = useRef<{ material: MeshStandardMaterial; base: number }[]>([])
  const tint = useMemo(() => ({ a: new Color(), b: new Color(), sun: new Vector3() }), [])
  useEffect(() => {
    const seen = new Set<MeshStandardMaterial>()
    scene.traverse(o => {
      if (!(o instanceof Mesh)) return
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        if (material instanceof MeshStandardMaterial && material.emissiveIntensity > 0 && material.emissive.getHex() !== 0 && !material.userData.managedGlow && !seen.has(material)) {
          seen.add(material); glowMaterials.current.push({ material, base: material.emissiveIntensity })
        }
      }
    })
    return () => { glowMaterials.current.forEach(({ material, base }) => { material.emissiveIntensity = base }); glowMaterials.current = [] }
  }, [scene])
  const skyDome = useRef<Mesh>(null)
  const skyMaterial = useRef<ShaderMaterial>(null)
  const groundMaterial = useRef<MeshStandardMaterial>(null)
  useEffect(()=>{if(groundMaterial.current){meadowDetail(groundMaterial.current);groundMaterial.current.needsUpdate=true}},[])
  const light = useRef<DirectionalLight>(null)
  useEffect(()=>{if(light.current){light.current.shadow.map?.dispose();light.current.shadow.map=null;light.current.shadow.mapSize.set(preset.shadow,preset.shadow)}},[preset.shadow])
  const islands = useRef<Group>(null)
  const plants = useRef<Group>(null)
  const resources = useMemo(() => {
    const rock = landform(), stones=[0,3,6].map(n=>weatheredStone(n)), leaf=leafBlade(.3,1.4,.4),stoneMaterial=artMaterial('#9aaba5')
    const floor = new PlaneGeometry(360, 360, 200, 200)
    const colors = new Float32Array(floor.attributes.position.count * 3)
    const base = new Color('#c4c4c4'), alternate = new Color('#eeeeee'), c = new Color()
    for (let i = 0; i < floor.attributes.position.count; i++) {
      const x = floor.attributes.position.getX(i), z = floor.attributes.position.getY(i)
      floor.attributes.position.setZ(i, riverbedHeight(x, -z))
      const patch = (Math.sin(x * 0.09 + Math.sin(z * 0.05) * 3) + Math.cos(z * 0.12 + x * 0.04)) * 0.14 + 0.45
      c.copy(base).lerp(alternate, patch).toArray(colors, i * 3)
    }
    floor.setAttribute('color', new Float32BufferAttribute(colors, 3)); floor.computeVertexNormals()
    return { rock, stones, leaf, stoneMaterial, floor, sky: { uRays:{value:0},uPhase:{value:.8},uQuality:{value:1},uTime: { value: 0 }, uTop: { value: new Color('#3787ce') }, uHorizon: { value: new Color('#a8dfed') }, uSunDirection: { value: new Vector3(-1, 0, -.4).normalize() }, uDay: { value: 1 }, uNight: { value: 0 }, uMoonDirection: { value: new Vector3(0, .5, -.8).normalize() }, uAurora: { value: 0 }, uMeteor: { value: 0 }, uHaze: { value: 1 }, uRain: {value:0}, uMoonSize:{value:1}, uCrescent:{value:0}, uStars:{value:1}, uRainbow:{value:0}, uLightning:{value:0}, uShower:{value:0}, uCloudGlow:{value:0} } }
  }, [])
  useEffect(() => () => {
    resources.rock.dispose(); resources.floor.dispose();resources.stones.forEach(g=>g.dispose());resources.leaf.dispose();resources.stoneMaterial.dispose()
  }, [resources])
  useFrame(({camera}, delta) => {
    skyDome.current?.position.copy(camera.position)
    updateEnvironmentState(delta)
    updateArtMaterial(resources.stoneMaterial,skyMaterial.current?.uniforms.uTime.value ?? 0)
    // R3F may copy uniform containers; mutate the mounted material, not the props template.
    const sky = skyMaterial.current?.uniforms
    if (!sky) return
    setUniform(sky.uTime, sky.uTime.value + delta)
    const { from, to, blend, sunX, sunY, daylight } = worldTime.current
    const smooth = 1 - Math.exp(-delta * 2)
    tint.a.set(from.top).lerp(tint.b.set(to.top), blend).lerp(env.skyTint, .12 * (1 - env.night)); sky.uTop.value.lerp(tint.a, smooth)
    tint.a.set(from.horizon).lerp(tint.b.set(to.horizon), blend).lerp(env.skyTint, .14 * (1 - env.night)); sky.uHorizon.value.lerp(tint.a, smooth)
    tint.sun.set(sunX, sunY, -.4).normalize()
    sky.uSunDirection.value.lerp(tint.sun, smooth).normalize()
    setUniform(sky.uRays,preset.rays&&graphicsState.rays&&['DAWN','MORNING','SUNSET'].includes(worldTime.current.phase)?Math.min(.6,env.haze*.35)*(1-env.rain):0);
    setUniform(sky.uPhase,graphicsState.moonPhase);setUniform(sky.uQuality,preset.water)
    setUniform(sky.uNight, env.night)
    setUniform(sky.uAurora, env.aurora)
    setUniform(sky.uMeteor, env.meteor)
    setUniform(sky.uHaze, env.haze)
    setUniform(sky.uRain, Math.max(env.rain, env.cloudiness * .6));setUniform(sky.uMoonSize,env.moonSize);setUniform(sky.uCrescent,env.crescent)
    setUniform(sky.uStars,env.starRichness);setUniform(sky.uRainbow,env.rainbow);setUniform(sky.uLightning,env.lightning)
    setUniform(sky.uShower,env.meteorShower);setUniform(sky.uCloudGlow,env.cloudGlow)
    tint.sun.set(-sunX, Math.max(.08, -sunY * .28), -.8).normalize()
    sky.uMoonDirection.value.lerp(tint.sun, smooth).normalize()
    env.skyTop.copy(sky.uTop.value); env.skyHorizon.copy(sky.uHorizon.value); env.moonDirection.copy(sky.uMoonDirection.value)
    if (groundMaterial.current) { groundMaterial.current.color.copy(env.grass).multiplyScalar(1-env.wetness*.18); groundMaterial.current.roughness = .88 - env.wetness * .4;const detail=groundMaterial.current.userData.meadow;if(detail){detail.uMeadowSnow.value=env.snow;detail.uMeadowDetail.value=preset.water;detail.uMeadowWet.value=env.wetness} }
    setUniform(sky.uDay, sky.uDay.value + (daylight - sky.uDay.value) * smooth)
    if (scene.fog instanceof Fog) {
      tint.a.set(from.fog).lerp(tint.b.set(to.fog), blend); scene.fog.color.lerp(tint.a, smooth); setFogRange(scene.fog, env.haze)
    }
    if (hemisphere.current) {
      // Preserve a low cool material floor at night without lifting the sky shader.
      const v2=getRendererMode()!=='V1'
      const ambient=Math.max(
        MathUtils.lerp(from.ambient,to.ambient,blend)*MathUtils.lerp(.74,.78,env.night),
        env.night*(v2?.42:NIGHT_TUNING.ambientFill),
      )
      hemisphere.current.intensity += (ambient - hemisphere.current.intensity) * smooth
      hemisphere.current.color.copy(sky.uHorizon.value).lerp(tint.a.set('#bbccec'), env.night * .65)
      hemisphere.current.groundColor.copy(env.grass).multiplyScalar(v2?.46:.32).lerp(tint.a.set(v2?'#303955':'#222b41'),env.night)
    }
    const glow = MathUtils.lerp(from.glow, to.glow, blend)
    for (const { material, base } of glowMaterials.current) updateGlow(material, base * glow, smooth)
    if (light.current) {
      tint.a.set(from.light).lerp(tint.b.set(to.light), blend); light.current.color.lerp(tint.a, smooth)
      // Moonlight only separates silhouettes; local fixtures remain the brightest lights.
      const celestial=Math.max(
        MathUtils.lerp(from.intensity,to.intensity,blend)*env.sunlight*(1-env.rain*.4)*MathUtils.lerp(1,.72,env.night),
        env.night*NIGHT_TUNING.moonIntensity,
      )
      light.current.intensity += (celestial - light.current.intensity) * smooth
      light.current.shadow.radius=v2NightShadowRadius(env.night,getRendererMode()!=='V1')
    }
    const t = sky.uTime.value
    if (islands.current) for (let i = 0; i < islands.current.children.length; i++) {
      const child = islands.current.children[i]
      child.position.y = Math.sin(t * 0.09 + i * 2) * 0.35
      child.rotation.y = Math.sin(t * 0.025 + i) * 0.025
    }
    if (plants.current) for (let i = 0; i < plants.current.children.length; i++) {
      plants.current.children[i].rotation.z = Math.sin(t * (.2 + env.wind * .5) + i * 1.7) * (.015 + env.wind * .055)
    }
    if (!light.current) return
    const { x, z } = player.current.position
    // Shadow volume follows the player; light direction matches the celestial body.
    tint.sun.copy(sky.uSunDirection.value).lerp(sky.uMoonDirection.value, env.night).normalize()
    tint.sun.set(x + tint.sun.x * 45, Math.max(3, tint.sun.y * 45), z + tint.sun.z * 45)
    light.current.position.lerp(tint.sun, smooth)
    light.current.target.position.set(x, 0, z)
    light.current.target.updateMatrixWorld()
  }, -3)
  return (
    <>
      <fog attach="fog" args={['#c7dce9', 75, 290]} />
      <mesh ref={skyDome} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[450, 48, 24]} />
        <shaderMaterial ref={skyMaterial} onUpdate={material=>{material.needsUpdate=true}} uniforms={resources.sky} vertexShader={skyVertex} fragmentShader={skyFragment} side={BackSide} depthWrite={false} />
      </mesh>
      <hemisphereLight ref={hemisphere} args={['#e6f2ff', '#648d98', 1.35]} />
      <directionalLight ref={light} intensity={1.25} color="#fff0d7" castShadow shadow-mapSize={[preset.shadow, preset.shadow]} shadow-radius={3}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14}
        shadow-camera-far={85} shadow-normalBias={0.035} shadow-bias={-0.0001} />
      <mesh geometry={resources.floor} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial ref={groundMaterial} vertexColors roughness={0.88} metalness={0.025} />
      </mesh>
      <Waterway player={player} />
      <ProceduralLakePark player={player}/>
      <WinterTree/>
      <RiverbankArt />
      <HeroMeadow />

      {/* Far ridges overlap the middle islands, leaving a valley toward the aperture. */}
      {rendererMode!=='V3_FULL'&&RIDGES.map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={i} geometry={resources.rock} position={[x, y, z]} scale={[sx, sy, sz]} rotation={[0, i * 0.3, 0]}>
          <meshStandardMaterial color={i < 5 ? '#a4a9e1' : '#7e8ccb'} roughness={0.93} />
        </mesh>
      ))}
      {rendererMode!=='V3_FULL'&&<group ref={islands}>
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
      </group>}
      {art.landmark ?? <WorldHalo />}
      <ContactDepth />
      {ROCKS.map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={i} geometry={resources.stones[i%3]} material={resources.stoneMaterial} position={[x, y, z]} scale={[sx, sy, sz]} rotation={[0, i * 0.7, 0.12]} castShadow receiveShadow>
        </mesh>
      ))}
      <MoruHome detail={art.homeDetail ?? <HomeCraft />} />
      <WorldAccents />
      <SeasonalDetails player={player} />
      <BloomGarden grove={art.grove ?? <FantasyGrove />} />
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
              <mesh key={n} geometry={resources.leaf} position={[Math.sin(n * 2) * 0.3, 0, Math.cos(n * 2) * 0.3]} scale={[1, 1 + n * 0.12, 1]}
                rotation={[0.25, n * 2, (n - 1.5) * 0.35]}>
                <meshStandardMaterial side={2} color="#98ddd5" roughness={0.63} metalness={0.08} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </>
  )
}
export default Environment
