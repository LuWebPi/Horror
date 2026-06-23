// Asset path helper.
// Next.js auto-prefixes <Image>, next/link and /_next/... assets with basePath,
// but raw TextureLoader URLs, <img src>, CSS url() and new Audio() are NOT prefixed.
// This helper adds the configured base path so the game works both at the domain
// root (dev) and on a GitHub Pages project subpath (/Horror/).

export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH || ''

// Prefix an absolute asset path (e.g. '/textures/wall.png') with the base path.
export function asset(path: string): string {
  if (!path.startsWith('/')) return path
  return BASE_PATH + path
}
