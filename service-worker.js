// Service Worker para Mi Agenda Financiera
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `agenda-financiera-${CACHE_VERSION}`;
const urlsToCache = [
  './',
  './agenda financieria.html',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap'
];

// Instalar el Service Worker
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Cache abierto:', CACHE_NAME);
        // Intentar cachear archivos, pero no fallar si CDN no está disponible
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`[ServiceWorker] No se pudo cachear ${url}:`, err);
            });
          })
        );
      })
      .catch(err => console.error('[ServiceWorker] Error en install:', err))
  );
  self.skipWaiting();
});

// Activar el Service Worker y limpiar cachés antiguos
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Estrategia de caché: Network First, fallback a Cache
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // No cachear solicitudes no-GET
  if (request.method !== 'GET') {
    return;
  }

  // Estrategia diferente para archivos locales vs CDN
  if (url.origin === self.location.origin) {
    // Archivos locales: Cache First
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request).then(response => {
            // Solo cachear respuestas exitosas
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
            return response;
          });
        })
        .catch(() => {
          // Fallback offline
          if (request.mode === 'navigate') {
            return caches.match('./agenda financieria.html');
          }
          return new Response('Recurso no disponible offline', { status: 503 });
        })
    );
  } else {
    // CDN: Network First con fallback a cache
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(response => response || new Response('CDN no disponible offline', { status: 503 }));
        })
    );
  }
});

// Mensaje desde el cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sincronización en background (opcional)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

async function syncTransactions() {
  try {
    // Aquí irían acciones de sincronización si fuera necesario
    console.log('[ServiceWorker] Sincronizando transacciones...');
  } catch (error) {
    console.error('[ServiceWorker] Error en sincronización:', error);
    throw error;
  }
}
