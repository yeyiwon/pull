import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, MeshStandardMaterial, Vector3 } from 'three'
import { environmentState as env } from './environmentState.ts'
import { streamCenter, streamWidth } from './terrain.ts'
import { worldTime } from './worldTime.ts'

function pathGeometry(side: number) {
  const geometry = new BufferGeometry(), positions: number[] = [], indices: number[] = []
  for (let i = 0; i <= 120; i++) {
    const z = 35 + i * .75
    const offset = 4.8 + .45 * Math.sin(z * .11) + .2 * Math.sin(z * .27)
    const x = streamCenter(z) + side * (streamWidth(z) + offset)
    const width = 2.1 + .28 * Math.sin(z * .083 + side)
    positions.push(x - width, .045, z, x + width, .045, z)
    if (i < 120) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
  }
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}
function connectorGeometry(points:[number,number][],halfWidth:number){
  const curve=new CatmullRomCurve3(points.map(([x,z])=>new Vector3(x,.048,z)))
  const geometry=new BufferGeometry(),positions:number[]=[],indices:number[]=[]
  for(let i=0;i<=48;i++){
    const p=curve.getPoint(i/48),tangent=curve.getTangent(i/48),length=Math.hypot(tangent.x,tangent.z)||1
    const nx=-tangent.z/length,nz=tangent.x/length,width=halfWidth*(1+.09*Math.sin(i*.37))
    positions.push(p.x-nx*width,p.y,p.z-nz*width,p.x+nx*width,p.y,p.z+nz*width)
    if(i<48){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}
  }
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
  return geometry
}

export default function Lakeside() {
  const r = useMemo(() => ({
    paths: [pathGeometry(-1), pathGeometry(1)],
    connectors:[
      connectorGeometry([[11,-16],[13,-4],[22,10],[29,25],[30,35]],1.35),
      connectorGeometry([[-13,5],[-4,12],[5,24],[11,35]],.95),
    ],
    path: new MeshStandardMaterial({color:'#b7aeb0', roughness:.9, side:2}),
    secondary: new MeshStandardMaterial({color:'#aaa09a',roughness:.94,side:2}),
  }), [])
  useEffect(() => () => {
    r.paths.forEach(g => g.dispose());r.connectors.forEach(g=>g.dispose());r.path.dispose();r.secondary.dispose()
  }, [r])
  useFrame(() => {
    const season = worldTime.realWorld.season
    r.path.color.set(season === 'winter' ? '#bdc2cc' : '#b7aeb0').multiplyScalar(1 - env.wetness * .22)
    r.path.setValues({roughness:.9 - env.wetness * .3})
    r.secondary.color.set(season==='winter'?'#aeb5c1':'#a89e95').multiplyScalar(1-env.wetness*.18)
  })
  return <group name="LakesideWalk">
    {r.paths.map((geometry, i) => <mesh key={i} geometry={geometry} material={r.path} receiveShadow/>)}
    {r.connectors.map((geometry,i)=><mesh key={`connector-${i}`} geometry={geometry} material={r.secondary} receiveShadow/>)}
  </group>
}
