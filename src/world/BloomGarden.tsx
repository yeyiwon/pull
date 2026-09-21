import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Color, Group, InstancedMesh, Object3D, TubeGeometry, Vector3 } from 'three'
import FantasyGrove from './FantasyGrove.tsx'
import { CRYSTALS, FLOWERS } from './worldLayout.ts'

export function Flower({ scale = 1 }: { scale?: number }) {
  const stem = useMemo(() => new TubeGeometry(new CatmullRomCurve3([
    new Vector3(), new Vector3(.15, 2, 0), new Vector3(.5, 4.2, .15), new Vector3(.3, 5, 0),
  ]), 16, .15, 7, false), [])
  useEffect(() => () => stem.dispose(), [stem])
  return <group scale={scale}>
    <mesh geometry={stem} castShadow><meshStandardMaterial color="#66bcb0" roughness={.65} /></mesh>
    <group position={[.3, 5, 0]} rotation={[.25, .2, .12]}>
      {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[Math.cos(i * Math.PI / 3) * 1.05, 0, Math.sin(i * Math.PI / 3) * 1.05]}
        rotation={[0, -i * Math.PI / 3, .15]} scale={[1.45, .3, .65]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color={i % 2 ? '#f09cd1' : '#d66ac0'} emissive="#b75299" emissiveIntensity={.15} roughness={.48} />
      </mesh>)}
      <mesh scale={[.7, .38, .7]}><sphereGeometry args={[1, 20, 12]} /><meshStandardMaterial color="#fff0be" emissive="#ffd4a0" emissiveIntensity={.35} /></mesh>
    </group>
    <mesh position={[.3, 2.2, 0]} rotation={[0, 0, .5]} scale={[1.3, .17, .45]}>
      <sphereGeometry args={[1, 16, 10]} /><meshStandardMaterial color="#8fe2b8" roughness={.6} />
    </mesh>
  </group>
}
const MOTE_ZONES = [[-8, -9], [15, -13], [-18, 15]] as const
function BloomGarden() {
  const flowers = useRef<Group>(null)
  const motes = useRef<InstancedMesh>(null)
  const time = useRef(0)
  const dummy = useMemo(() => new Object3D(), [])
  useEffect(() => {
    if (!motes.current) return
    const colors = ['#ffcfef', '#bdf5ed', '#fff1b8']
    for (let i = 0; i < 18; i++) motes.current.setColorAt(i, new Color(colors[i % 3]))
    if (motes.current.instanceColor) motes.current.instanceColor.needsUpdate = true
  }, [])
  useFrame((_, delta) => {
    time.current += delta
    const t = time.current
    if (flowers.current) for (let i = 0; i < flowers.current.children.length; i++) {
      flowers.current.children[i].rotation.z = Math.sin(t * (.19 + i * .013) + i) * .022
    }
    if (motes.current) {
      for (let i = 0; i < 18; i++) {
        const patch = i % 3
        dummy.position.set(MOTE_ZONES[patch][0] + Math.sin(i * 2.1 + t * .13) * 2.2,
          1.4 + Math.sin(i * 1.7 + t * .21) * .85, MOTE_ZONES[patch][1] + Math.cos(i * 1.3 + t * .09) * 2.2)
        dummy.rotation.set(t * .12 + i, i, t * .07)
        dummy.scale.set(.1, .04, .17); dummy.updateMatrix()
        motes.current.setMatrixAt(i, dummy.matrix)
      }
      motes.current.instanceMatrix.needsUpdate = true
    }
  })
  return <>
    <FantasyGrove />
    <group ref={flowers}>{FLOWERS.map(([x, z, s], i) => <group key={i} position={[x, 0, z]}><Flower scale={s} /></group>)}</group>
    {CRYSTALS.map(([x, z, s], i) => <group key={i} position={[x, 1.7 * s, z]} scale={s}>
      <mesh position={[0, -.4, 0]} castShadow><cylinderGeometry args={[.55, .85, 2.6, 5]} />
        <meshStandardMaterial color={i % 2 ? '#a487ef' : '#61d4d2'} emissive={i % 2 ? '#7351bc' : '#419fa9'} emissiveIntensity={.25} metalness={.25} roughness={.22} flatShading />
      </mesh>
      <mesh position={[0, 1.3, 0]}><cylinderGeometry args={[0, .55, .8, 5]} />
        <meshStandardMaterial color={i % 2 ? '#c8b2ff' : '#a5fff1'} emissive="#9ecddf" emissiveIntensity={.25} roughness={.25} metalness={.2} flatShading />
      </mesh>
    </group>)}
    <instancedMesh ref={motes} args={[undefined, undefined, 18]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial transparent opacity={.65} depthWrite={false} />
    </instancedMesh>
  </>
}
export default BloomGarden
