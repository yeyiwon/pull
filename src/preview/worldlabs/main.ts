import { AnimationMixer, Box3, Color, DirectionalLight, DoubleSide, Group, HemisphereLight, Mesh, MeshBasicMaterial, NoToneMapping, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'
import type { AnimationAction } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark'
import { ColliderSurface } from './collision.ts'
import './preview.css'

document.body.innerHTML = `<main id="preview"><div id="stage"></div><section><strong>World Labs × Moru</strong><span id="status">공간을 불러오는 중…</span><small>독립 preview · WASD 이동 · Shift 달리기 · Drag 둘러보기 · Scroll 거리</small><div><button id="reset">시작 위치</button><label><input id="collider" type="checkbox"> Collider</label><label>Moru <input id="height" type="range" min="0.9" max="2.8" step="0.1" value="1.4"><output id="heightLabel">1.4m</output></label><a href="/">PULL로 돌아가기</a></div><small id="stats"></small></section><nav aria-label="이동"><button data-key="KeyW">↑</button><div><button data-key="KeyA">←</button><button data-key="KeyS">↓</button><button data-key="KeyD">→</button></div></nav></main>`
const status = document.querySelector<HTMLSpanElement>('#status')!
if (!import.meta.env.DEV) throw new Error('World Labs preview is development-only')

async function start() {
  const renderer = new WebGLRenderer({ antialias: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.toneMapping = NoToneMapping
  renderer.info.autoReset = false
  document.querySelector('#stage')!.appendChild(renderer.domElement)
  const scene = new Scene()
  const characterScene = new Scene(), depthScene = new Scene(), debugScene = new Scene()
  scene.background = new Color('#222c36')
  const camera = new PerspectiveCamera(55, innerWidth / innerHeight, .05, 600)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 2.3; controls.maxDistance = 12
  controls.minPolarAngle = .25; controls.maxPolarAngle = Math.PI * .48
  const resize = () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) }
  addEventListener('resize', resize); resize()
  const spark = new SparkRenderer({ renderer })
  scene.add(spark)
  const metadata = await fetch('/asset-source/worldlabs-poc/metadata.json').then(r => { if (!r.ok) throw Error('Preview assets unavailable'); return r.json() })
  const environment = new Group()
  // Official Marble raw OpenCV → metric → Three.js conversion, shared by both assets.
  environment.rotation.x = Math.PI
  environment.scale.setScalar(metadata.semantics.metric_scale_factor)
  environment.position.y = metadata.semantics.ground_plane_offset
  scene.add(environment)
  const quality = new URLSearchParams(location.search).get('quality') === '100k' ? '100k' : '500k'
  const splat = new SplatMesh({ url: `/asset-source/worldlabs-poc/lakeside-${quality}.spz` })
  splat.visible = !new URLSearchParams(location.search).has('noSplat')
  environment.add(splat)
  const loader = new GLTFLoader()
  const [collision, base, idle, run] = await Promise.all([
    loader.loadAsync('/asset-source/worldlabs-poc/collider.glb'),
    loader.loadAsync('/moru/moru-walk.glb'),
    loader.loadAsync('/moru/clips/moru-short-breathe-and-look-around.glb'),
    loader.loadAsync('/moru/clips/moru-running.glb'),
    splat.initialized,
  ])
  const debugMaterial = new MeshBasicMaterial({ color: '#8cf6cf', wireframe: true, transparent: true, opacity: .32, side: DoubleSide, depthWrite: false })
  const depthMaterial = new MeshBasicMaterial({ colorWrite: false, depthWrite: true, side: DoubleSide })
  const colliderFrame = new Group()
  colliderFrame.position.copy(environment.position); colliderFrame.quaternion.copy(environment.quaternion); colliderFrame.scale.copy(environment.scale)
  collision.scene.traverse(o => { if (o instanceof Mesh) o.material = depthMaterial })
  colliderFrame.add(collision.scene); depthScene.add(colliderFrame); colliderFrame.updateMatrixWorld(true)
  const colliderDebug = colliderFrame.clone(true)
  colliderDebug.traverse(o => { if (o instanceof Mesh) o.material = debugMaterial })
  colliderDebug.visible = false; debugScene.add(colliderDebug)
  const surface = new ColliderSurface(collision.scene)
  const body = new Group(), model = base.scene
  model.updateMatrixWorld(true)
  const box = new Box3().setFromObject(model), size = box.getSize(new Vector3()), center = box.getCenter(new Vector3())
  model.position.set(-center.x, -box.min.y, -center.z)
  body.add(model); characterScene.add(body)
  const heightInput = document.querySelector<HTMLInputElement>('#height')!
  const setHeight = () => { body.scale.setScalar(Number(heightInput.value) / size.y); document.querySelector('#heightLabel')!.textContent = `${heightInput.value}m` }
  heightInput.addEventListener('input', setHeight); setHeight()
  characterScene.add(new HemisphereLight('#eaf0ff', '#75675c', 1.4))
  const key = new DirectionalLight('#ffe8cd', 1.8); key.position.set(-8, 12, 5); characterScene.add(key)
  const mixer = new AnimationMixer(model)
  const clips = [...base.animations, ...idle.animations, ...run.animations]
  const actions: Record<string, AnimationAction> = {}
  for (const name of ['Walking', 'Running', 'Short_Breathe_and_Look_Around']) {
    const clip = clips.find(c => c.name === name)
    if (!clip) throw Error(`Missing original animation: ${name}`)
    actions[name] = mixer.clipAction(clip)
  }
  let active = actions.Short_Breathe_and_Look_Around
  active.play()
  const position = new Vector3(), spawn = new Vector3()
  let found = false
  for (let radius = 0; radius <= 5 && !found; radius++) for (let angle = 0; angle < 8 && !found; angle++) {
    const x = Math.cos(angle * Math.PI / 4) * radius, z = Math.sin(angle * Math.PI / 4) * radius
    const y = surface.ground(x, z, 3, 8)
    if (y !== null) { spawn.set(x, y, z); found = true }
  }
  if (!found) throw Error('No walkable collider surface near the generated origin; spawn needs inspection')
  const reset = () => { position.copy(spawn); body.position.copy(position); controls.target.copy(position).y += .9; camera.position.copy(controls.target).add(new Vector3(1.2, 1.2, 5.5)); controls.update() }
  reset()
  document.querySelector('#reset')!.addEventListener('click', reset)
  document.querySelector('#collider')!.addEventListener('change', event => { colliderDebug.visible = (event.target as HTMLInputElement).checked })
  const keys = new Set<string>()
  const keydown = (event: KeyboardEvent) => { if ((event.target as HTMLElement).matches('input,button')) return; if (/^(Key[WASD]|Arrow|Shift)/.test(event.code)) { event.preventDefault(); keys.add(event.code) } }
  const keyup = (event: KeyboardEvent) => keys.delete(event.code)
  addEventListener('keydown', keydown); addEventListener('keyup', keyup); addEventListener('blur', () => keys.clear())
  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(button => {
    button.addEventListener('pointerdown', event => { button.setPointerCapture(event.pointerId); keys.add(button.dataset.key!) })
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => keys.delete(button.dataset.key!))
  })
  const forward = new Vector3(), right = new Vector3(), movement = new Vector3(), old = new Vector3(), target = new Vector3(), up = new Vector3(0, 1, 0)
  let previous = performance.now(), measured = previous, frames = 0
  status.textContent = `${quality} SPZ + Original Meshy Moru · 지형 정렬 검수용`
  renderer.setAnimationLoop(now => {
    const dt = Math.min((now - previous) / 1000, .05); previous = now
    const x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'))
    const z = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'))
    camera.getWorldDirection(forward); forward.y = 0; forward.normalize(); right.crossVectors(forward, up)
    movement.copy(forward).multiplyScalar(z).addScaledVector(right, x).normalize()
    old.copy(position)
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight')
    if (x || z) {
      const distance = (running ? 2.6 : 1.4) * dt, steps = Math.max(1, Math.ceil(distance / .06))
      for (let i = 0; i < steps; i++) surface.step(position, movement.x * distance / steps, movement.z * distance / steps)
      const yaw = Math.atan2(movement.x, movement.z)
      body.rotation.y += Math.atan2(Math.sin(yaw - body.rotation.y), Math.cos(yaw - body.rotation.y)) * (1 - Math.exp(-10 * dt))
    }
    const moving = position.distanceToSquared(old) > .00000001
    const next = actions[moving ? running ? 'Running' : 'Walking' : 'Short_Breathe_and_Look_Around']
    if (next !== active) { active.fadeOut(.2); next.reset().fadeIn(.2).play(); active = next }
    mixer.update(dt); body.position.copy(position)
    target.copy(position).y += Number(heightInput.value) * .65
    old.copy(controls.target); controls.target.lerp(target, 1 - Math.exp(-8 * dt)); old.sub(controls.target); camera.position.sub(old)
    controls.update(); renderer.info.reset(); renderer.render(scene, camera)
    // The supplied collider owns solid occlusion, not the centers of broad translucent Gaussians.
    // This keeps Moru behind real walls without coating the body in foreground splat fragments.
    renderer.clearDepth(); renderer.autoClear = false
    renderer.render(depthScene, camera); renderer.render(characterScene, camera)
    if (colliderDebug.visible) renderer.render(debugScene, camera)
    renderer.autoClear = true
    frames++
    if (now - measured > 1000) { document.querySelector('#stats')!.textContent = `${Math.round(frames * 1000 / (now - measured))} FPS · ${renderer.info.render.calls} draws · x ${position.x.toFixed(1)} / y ${position.y.toFixed(1)} / z ${position.z.toFixed(1)}`; frames = 0; measured = now }
  })
  const dispose = () => { renderer.setAnimationLoop(null); controls.dispose(); mixer.stopAllAction(); splat.dispose(); spark.dispose(); debugMaterial.dispose(); depthMaterial.dispose(); renderer.dispose(); removeEventListener('resize', resize); removeEventListener('keydown', keydown); removeEventListener('keyup', keyup) }
  // Static capture avoids a software-WebGL frame queue during automated screenshots.
  const pauseCapture = () => renderer.setAnimationLoop(null)
  addEventListener('pull-preview-capture', pauseCapture)
  import.meta.hot?.dispose(() => removeEventListener('pull-preview-capture', pauseCapture))
  import.meta.hot?.dispose(dispose)
}
start().catch(error => { status.textContent = `Preview를 시작하지 못했습니다: ${error instanceof Error ? error.message : 'unknown error'}`; console.error('World Labs preview failed', error) })
