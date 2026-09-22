import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, SphereGeometry, Vector3 } from 'three'

// Authored profiles, shared by the grove, masonry and river. No random topology at mount.
export function weatheredStone(seed = 0, foliage = false, segments = 28) {
  const g = new SphereGeometry(1, segments, Math.round(segments*.64)), p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const a = Math.atan2(z, x)
    const folds = foliage
      ? 1 + .07 * Math.sin(a * 5 + seed + y * 4) + .025 * Math.cos(a * 9 - y * 6)
      : 1 + .1 * Math.sin(a * 3 + seed + y * 2) + .045 * Math.sin(y * 17 + a * 2)
    p.setXYZ(i, x * folds + y * .09, foliage ? y * folds : Math.max(-.58, y * (.9 + .1 * Math.cos(x * 4 + seed))), z * folds)
  }
  g.computeVertexNormals(); g.computeBoundingSphere(); return g
}

export function branch(points: number[][], radius: number, end = .025, steps = 18, sides = 9) {
  const curve = new CatmullRomCurve3(points.map(p => new Vector3(...p as [number, number, number])))
  const frames = curve.computeFrenetFrames(steps, false)
  const vertices: number[] = [], indices: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, p = curve.getPointAt(t), r = end + (radius - end) * Math.pow(1 - t, 1.25)
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2, wobble = 1 + .075 * Math.sin(a * 3 + t * 7)
      const v = p.clone().addScaledVector(frames.normals[i], Math.cos(a) * r * wobble).addScaledVector(frames.binormals[i], Math.sin(a) * r * wobble)
      vertices.push(v.x, v.y, v.z)
      if (i < steps && j < sides) { const k = i * (sides + 1) + j; indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1) }
    }
  }
  const g = new BufferGeometry(); g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g
}

// Curved, cupped lamina rather than a scaled sphere or flat billboard.
export function leafBlade(width = .3, length = 1, cup = .2) {
  const p: number[] = [], idx: number[] = []
  for(let i=0;i<=8;i++)for(let j=0;j<=4;j++){
    const t=i/8,s=j/2-1,w=Math.sin(Math.PI*t)*width
    p.push(s*w,length*t,cup*t*t+Math.abs(s)*w*.28)
    if(i<8&&j<4){const k=i*5+j;idx.push(k,k+1,k+5,k+1,k+6,k+5)}
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g
}
