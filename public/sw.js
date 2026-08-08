const CACHE_NAME = 'on-thi-xe-may-v1'
const QUESTION_IMAGES = Array.from({ length: 55 }, (_, index) => {
  const id = index + 96
  const extension = [130, 131, 133].includes(id) ? 'png' : 'jpg'
  return `/question-images/q${String(id).padStart(3, '0')}.${extension}`
})

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    const response = await fetch('/')
    const html = await response.clone().text()
    await cache.put('/', response)
    const shellAssets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
      .map((match) => match[1])
      .filter((url) => url.startsWith('/'))
    await cache.addAll([...new Set([
      '/manifest.webmanifest',
      '/icon.svg',
      ...shellAssets,
      ...QUESTION_IMAGES,
    ])])
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith((async () => {
    const cached = await caches.match(event.request)
    if (cached) return cached
    try {
      const response = await fetch(event.request)
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(event.request, response.clone())
      }
      return response
    } catch {
      if (event.request.mode === 'navigate') return (await caches.match('/'))
      throw new Error('offline')
    }
  })())
})
