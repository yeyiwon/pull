import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, SphereGeometry, CylinderGeometry, MeshStandardMaterial, InstancedMesh, Object3D } from 'three'
import { TREES, MUSHROOMS } from './worldLayout.ts'

// Shared resources keep the few hero silhouettes inexpensive.
export default function FantasyGrove() {
  const grass = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const crowns = useRef<Group>(null)
  const time = useRef(0)
  const r = useMemo(() => ({
    sphere: new SphereGeometry(1, 18, 12), trunk: new CylinderGeometry(.3, .55, 6, 10),
    bark: new MeshStandardMaterial({ color: '#607f95', roughness: .8 }),
    leaves: ['#65c9ae', '#90cfd9', '#c19ddb'].map(color => new MeshStandardMaterial({ color, roughness: .65 })),
    fruit: new MeshStandardMaterial({ color: '#fff0b4', emissive: '#ffd58f', emissiveIntensity: .6 }),
    cap: new MeshStandardMaterial({ color: '#eea5bd', emissive: '#b56694', emissiveIntensity: .12, roughness: .6 }),
  }), [])
  useEffect(() => () => { r.sphere.dispose(); r.trunk.dispose(); r.bark.dispose(); r.fruit.dispose(); r.cap.dispose(); r.leaves.forEach(m => m.dispose()) }, [r])
  useFrame((_, delta) => {
    time.current += delta
    if (grass.current) {
      for (let i = 0; i < 75; i++) {
        const [x, z, scale] = TREES[i % TREES.length]
        const angle = i * 2.399
        const radius = 2.2 + (i % 7) * .35
        dummy.position.set(x + Math.cos(angle) * radius, .3, z + Math.sin(angle) * radius)
        dummy.rotation.set(.12, angle, Math.sin(time.current * .45 + i) * .1)
        dummy.scale.set(.14, (.45 + i % 4 * .13) * scale, .08)
        dummy.updateMatrix(); grass.current.setMatrixAt(i, dummy.matrix)
      }
      grass.current.instanceMatrix.needsUpdate = true
    }
    crowns.current?.children.forEach((c, i) => { c.rotation.z = Math.sin(time.current * (.12 + i * .017) + i * 2) * .018 })
  })
  return <>
    <instancedMesh ref={grass} args={[r.sphere, r.leaves[0], 75]} frustumCulled={false} />
    {TREES.map(([x, z, s], i) => <mesh key={i} position={[x, 3 * s, z]} scale={s} geometry={r.trunk} material={r.bark} castShadow />)}
    <group ref={crowns}>{TREES.map(([x, z, s, family], i) => <group key={i} position={[x, 0, z]} scale={s}>
      {[0, 1, 2].map(n => <mesh key={n} position={[Math.sin(n * 2 + i) * 1.3, 6 + n * .8, Math.cos(n * 2) * .9]} scale={family === 1 ? [2.6 - n * .3, .8, 2.1] : [2.1, 1.4, 1.8]} geometry={r.sphere} material={r.leaves[family]} castShadow />)}
      {[0, 1, 2].map(n => <group key={n} position={[Math.cos(n * 2) * 1.7, 4.8 - n * .3, Math.sin(n * 2) * 1.7]}>
        <mesh geometry={r.sphere} material={r.leaves[family]} scale={[.14, 1.3, .2]} />
        <mesh geometry={r.sphere} material={r.fruit} position={[0, -1.1, 0]} scale={.16} />
      </group>)}
    </group>)}</group>
    {MUSHROOMS.map(([x, z, s], i) => <group key={i} position={[x, 0, z]} scale={s}>
      <mesh geometry={r.trunk} material={r.bark} position={[0, 1.5, 0]} scale={[.7, .5, .7]} />
      <mesh geometry={r.sphere} material={r.cap} position={[0, 3, 0]} scale={[2.5, .85, 2.3]} castShadow />
      <mesh geometry={r.sphere} material={r.fruit} position={[0, 2.7, 0]} scale={[2.1, .12, 1.9]} />
    </group>)}
  </>
}
