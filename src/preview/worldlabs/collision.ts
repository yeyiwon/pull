import { Ray, Vector3 } from 'three'
import type { Object3D, Triangle } from 'three'
import { Octree } from 'three/addons/math/Octree.js'

// Preview-only surface queries. No dependency on the production PULL terrain.
export class ColliderSurface {
  private ray = new Ray()
  private tree = new Octree()
  private triangles: Triangle[] = []
  private hit = new Vector3()
  private origin = new Vector3()
  private down = new Vector3(0, -1, 0)
  private normal = new Vector3()
  private direction = new Vector3()
  readonly root: Object3D
  constructor(root: Object3D) { this.root = root; root.updateMatrixWorld(true); this.tree.fromGraphNode(root) }
  ground(x: number, z: number, ceiling: number, distance = 4): number | null {
    this.ray.set(this.origin.set(x, ceiling, z), this.down)
    this.triangles.length = 0
    this.tree.getRayTriangles(this.ray, this.triangles)
    let height: number | null = null
    for (const triangle of this.triangles) {
      if (!this.ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, this.hit)) continue
      if (this.hit.distanceTo(this.origin) > distance) continue
      triangle.getNormal(this.normal)
      if (Math.abs(this.normal.y) >= .65 && (height === null || this.hit.y > height)) height = this.hit.y
    }
    return height
  }
  step(position: Vector3, dx: number, dz: number): boolean {
    const ground = this.ground(position.x + dx, position.z + dz, position.y + .38, 1.1)
    if (ground === null || Math.abs(ground - position.y) > .34) return false
    const length = Math.hypot(dx, dz)
    if (length < .00001) return false
    const direction = this.direction.set(dx / length, 0, dz / length)
    for (const height of [.35, .9]) {
      this.ray.set(this.origin.copy(position).addScaledVector(this.down, -height), direction)
      this.triangles.length = 0
      this.tree.getRayTriangles(this.ray, this.triangles)
      for (const triangle of this.triangles) if (this.ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, this.hit) && this.hit.distanceTo(this.origin) < length + .2) return false
    }
    position.set(position.x + dx, ground, position.z + dz)
    return true
  }
}
