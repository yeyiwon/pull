// Presentation stays inside the existing reaction lifetime, so Brain resume is unchanged.
const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }
export function speechEnvelope(age: number, duration: number, reducedMotion = false) {
 const enter = smooth((age - .3) / .45)
 const exit = smooth((age - (duration - .65)) / .65)
 return { opacity: age >= duration ? 0 : enter * (1 - exit),
  blur: reducedMotion ? 0 : (1 - enter) * 1.2 + exit * 1.2,
  rise: reducedMotion ? 0 : enter * 2 + exit * 4 }
}
