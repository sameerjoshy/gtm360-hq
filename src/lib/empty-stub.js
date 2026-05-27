// Stub for Node.js built-ins that the Anthropic SDK's server-only toolset imports.
// These code paths are never reached in browser builds — this stub prevents
// Vite/Rollup from erroring on unresolvable node: imports.
export default {}
export const readFile = () => { throw new Error('fs not available in browser') }
export const writeFile = readFile
export const mkdir = readFile
export const rm = readFile
export const stat = readFile
export const readdir = readFile
export const join = (...args) => args.join('/')
export const resolve = (...args) => args.join('/')
export const dirname = (p) => p.split('/').slice(0, -1).join('/')
export const basename = (p) => p.split('/').pop()
export const extname = (p) => { const b = p.split('/').pop(); const i = b.lastIndexOf('.'); return i < 0 ? '' : b.slice(i) }
export const randomUUID = () => crypto.randomUUID()
