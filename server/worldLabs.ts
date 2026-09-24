// Server-only World Labs PoC adapter. Never import this from the Vite client.
const BASE = 'https://api.worldlabs.ai/marble/v1'
export const PULL_LAKESIDE_POC_PROMPT = 'A vast serene lakeside world for a premium contemporary animated-film fantasy experience. A large natural lake dominates the landscape, with convincing deep clear water and an irregular organic shoreline. A wide elegant walking promenade follows the lake, with generous open space for benches and lampposts. Mature trees form layered natural canopies, including a graceful cherry-tree avenue along one section of the path. Rich grasses, weeds, reeds, wildflowers and ground vegetation grow naturally around the path and shoreline. A sophisticated warm timber-and-stone fantasy cottage sits within walking distance of the lake. Distant monumental mountains create depth without dominating the scene. The environment should feel lush, spacious, cinematic and inhabitable rather than like a small game map. Painterly stylized realism with premium contemporary animated-film environmental quality. Realistic material response, natural terrain elevation, rich foreground/midground/background layering, atmospheric depth, elegant asymmetry and strong composition. At dusk and night, refined park lampposts create warm ivory light with an extremely subtle lavender atmospheric tint, reflected softly across the lake. Avoid Roblox, low-poly geometry, primitive game terrain, narrow paths, flat paper-like surfaces, toy proportions, neon cyberpunk, excessive fantasy ornament, and generic mobile-game aesthetics.'
export type WorldLabsModel = 'marble-1.1' | 'marble-1.1-plus'
export type WorldLabsOperation = {
  operation_id: string
  done: boolean
  error?: { code?: number; message?: string } | null
  metadata?: { world_id?: string; progress?: { status?: string } } | null
  response?: WorldLabsWorld | null
  cost?: { total_credits?: number } | null
}
export type WorldLabsWorld = {
  id?: string
  world_id?: string
  world_marble_url?: string
  model?: string
  assets?: {
    splats?: { spz_urls?: Record<string, string> }
    mesh?: { collider_mesh_url?: string; hq_mesh_url?: string; full_res_mesh_url?: string }
    imagery?: { pano_url?: string }
  }
}
export class WorldLabsError extends Error {
  readonly status: number | null
  readonly errorType: string
  readonly safeDescription: string
  constructor(status: number | null, errorType: string, safeDescription: string) {
    super(`${errorType}: ${safeDescription}`)
    this.status = status
    this.errorType = errorType
    this.safeDescription = safeDescription
  }
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export class WorldLabsClient {
  private readonly apiKey: string | undefined
  private readonly requestFetch: typeof fetch
  constructor(apiKey: string | undefined, requestFetch: typeof fetch = (input, init) => fetch(input, init)) {
    this.apiKey = apiKey
    this.requestFetch = requestFetch
  }
  get configured() { return Boolean(this.apiKey?.trim()) }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.configured) throw new WorldLabsError(null, 'configuration', 'WORLDLABS_API_KEY is not configured')
    let response: Response
    try {
      response = await this.requestFetch(`${BASE}${path}`, {
        ...init,
        headers: { 'WLT-Api-Key': this.apiKey!, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
        signal: init.signal ?? AbortSignal.timeout(30000),
      })
    } catch (error) {
      throw new WorldLabsError(null, error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network', 'World Labs request did not complete')
    }
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const detail = record(record(body).detail)
      const error = record(record(body).error)
      // Never echo provider text: it could include request content or account data.
      const rawType = String(error.type ?? detail.type ?? `http_${response.status}`)
      const type = /^[a-zA-Z0-9_-]{1,64}$/.test(rawType) ? rawType : `http_${response.status}`
      throw new WorldLabsError(response.status, type, `World Labs returned HTTP ${response.status}`)
    }
    return body as T
  }

  async credits(): Promise<number> {
    const result = await this.request<{ remaining_credits: number }>('/credits')
    if (!Number.isFinite(result.remaining_credits)) throw new WorldLabsError(null, 'response', 'Invalid credits response')
    return result.remaining_credits
  }
  async generate(prompt: string, model: WorldLabsModel, signal?: AbortSignal): Promise<WorldLabsOperation> {
    if (!prompt.trim()) throw new WorldLabsError(null, 'configuration', 'A text prompt is required')
    return this.request('/worlds:generate', { method: 'POST', signal, body: JSON.stringify({
      display_name: 'PULL Lakeside PoC', model, world_prompt: { type: 'text', text_prompt: prompt },
    }) })
  }
  operation(id: string, signal?: AbortSignal) {
    return this.request<WorldLabsOperation>(`/operations/${encodeURIComponent(id)}`, { signal })
  }
  world(id: string, signal?: AbortSignal) {
    return this.request<{ world: WorldLabsWorld }>(`/worlds/${encodeURIComponent(id)}`, { signal })
  }
  async waitForWorld(id: string, options: { intervalMs?: number; maxPolls?: number; signal?: AbortSignal } = {}) {
    const intervalMs = options.intervalMs ?? 10000
    const maxPolls = options.maxPolls ?? 60
    for (let attempt = 0; attempt < maxPolls; attempt++) {
      const operation = await this.operation(id, options.signal)
      if (operation.done) {
        if (operation.error) throw new WorldLabsError(null, 'operation', 'World generation failed')
        return operation
      }
      if (attempt + 1 < maxPolls) await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, intervalMs)
        options.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new WorldLabsError(null, 'aborted', 'Polling cancelled')) }, { once: true })
      })
    }
    throw new WorldLabsError(null, 'poll_limit', 'World generation did not finish within the polling limit')
  }
}
