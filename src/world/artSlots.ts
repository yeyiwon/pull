import type { ReactNode } from 'react'

/** Authored GLB adapters can replace art without taking ownership of player or collision state.
 * Home detail is house-local; grove and landmark are world-space. See docs/environment-art-pass.md.
 */
export interface EnvironmentArtSlots {
  homeDetail?: ReactNode
  grove?: ReactNode
  landmark?: ReactNode
}
