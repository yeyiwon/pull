import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Group, TubeGeometry, Vector3 } from 'three'
import { environmentState as env } from './environmentState.ts'
import FantasyGrove from './FantasyGrove.tsx'
import { leafBlade, weatheredStone } from './artGeometry.ts'
import { artMaterial, updateArtMaterial } from '../graphics/artMaterial.ts'
import { DoubleSide } from 'three'
import { CRYSTALS, FLOWERS } from './worldLayout.ts'

export function Flower({ scale = 1 }: { scale?: number }) {
  const blossom = useRef<Group>(null)
  useFrame(() => { if (blossom.current) blossom.current.scale.setScalar(.25 + env.bloom * .75) })
  const stem = useMemo(() => new TubeGeometry(new CatmullRomCurve3([
    new Vector3(), new Vector3(.15, 2, 0), new Vector3(.5, 4.2, .15), new Vector3(.3, 5, 0),
  ]), 16, .15, 7, false), [])
  const petal=useMemo(()=>leafBlade(.65,2.1,.45),[])
  useEffect(() => () => {stem.dispose();petal.dispose()}, [stem,petal])
  return <group scale={scale}>
    <mesh geometry={stem} castShadow><meshStandardMaterial color="#66bcb0" roughness={.65} /></mesh>
    <group ref={blossom} position={[.3, 5, 0]} rotation={[.25, .2, .12]}>
      {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} geometry={petal} position={[0, 0, 0]}
        rotation={[Math.PI/2-.22, 0, i * Math.PI / 3]}>
        <meshStandardMaterial side={DoubleSide} color={i % 2 ? '#f09cd1' : '#d66ac0'} emissive="#b75299" emissiveIntensity={.15} roughness={.48} />
      </mesh>)}
      <mesh scale={[.7, .38, .7]}><sphereGeometry args={[1, 20, 12]} /><meshStandardMaterial color="#fff0be" emissive="#ffd4a0" emissiveIntensity={.35} /></mesh>
    </group>
    <mesh position={[.3, 2.2, 0]} rotation={[0, 0, .5]} scale={[1.3, .17, .45]}>
      <sphereGeometry args={[1, 16, 10]} /><meshStandardMaterial color="#8fe2b8" roughness={.6} />
    </mesh>
  </group>
}
function BloomGarden({grove}:{grove?:ReactNode}) {
  const flowers=useRef<Group>(null),time=useRef(0)
  const stones=useMemo(()=>({geometry:[0,2,4].map(n=>weatheredStone(n)),material:artMaterial('#879e9b')}),[])
  useEffect(()=>()=>{stones.geometry.forEach(g=>g.dispose());stones.material.dispose()},[stones])
  useFrame((_,dt)=>updateArtMaterial(stones.material,time.current+dt))
  useFrame((_,delta)=>{time.current+=delta;flowers.current?.children.forEach((flower,i)=>{flower.rotation.z=Math.sin(time.current*(.15+env.wind*.3)+i)*(.01+env.wind*.04)})})
  return <>
    {grove ?? <FantasyGrove />}
    <group ref={flowers}>{FLOWERS.map(([x, z, s], i) => <group key={i} position={[x, 0, z]}><Flower scale={s} /></group>)}</group>
    {CRYSTALS.map(([x,z,s],i)=><group key={i} position={[x,0,z]} scale={s} rotation={[0,i*.8,0]}>
      <mesh geometry={stones.geometry[i%3]} material={stones.material} position={[0,.32,0]} scale={[.85,.75,.65]} castShadow receiveShadow/>
      <mesh geometry={stones.geometry[(i+1)%3]} material={stones.material} position={[.21,1.15,.02]} scale={[.47,.72,.43]} rotation={[.1,0,-.16]} castShadow receiveShadow/>
      <mesh geometry={stones.geometry[(i+2)%3]} position={[.08,.83,.36]} scale={[.12,.31,.045]} rotation={[0,0,-.24]}>
        <meshStandardMaterial color="#8fbbb5" emissive="#668f90" emissiveIntensity={.08} metalness={.18} roughness={.3}/>
      </mesh>
    </group>)}

  </>
}
export default BloomGarden
