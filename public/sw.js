const CACHE_NAME = 'jasmine-pedro-shell-v3'
const APP_BASE = new URL(self.registration.scope)
const APP_ROOT = new URL('./', APP_BASE).href
const CORE_ASSETS = [
  '',
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS.map(asset => new URL(asset, APP_BASE).href))))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('jasmine-pedro-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)),
  )))
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== APP_BASE.origin || !url.pathname.startsWith(APP_BASE.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) void caches.open(CACHE_NAME).then(cache => cache.put(APP_ROOT, response.clone()))
      return response
    }).catch(async () => (await caches.match(APP_ROOT)) || Response.error()))
    return
  }

  event.respondWith(caches.match(request).then(cached => {
    const fresh = fetch(request).then(response => {
      if (response.ok) void caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
      return response
    }).catch(() => cached)
    return cached || fresh
  }))
})
