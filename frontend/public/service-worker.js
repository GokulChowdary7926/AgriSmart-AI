
const CACHE_NAME = 'krishi-mitra-v2';
const OFFLINE_URL = '/offline.html';
const API_CACHE_NAME = 'krishi-mitra-api-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

const API_ENDPOINTS = [
  '/api/crops',
  '/api/crop/rice',
  '/api/crop/wheat',
  '/api/crop/tomato',
  '/api/crop/potato',
  '/api/crop/onion'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker installed');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              return caches.match(OFFLINE_URL);
            });
        })
    );
  } else {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
              return response;
            });
        })
    );
  }
});

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = request;
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      caches.open(API_CACHE_NAME).then((cache) => {
        cache.put(cacheKey, responseClone);
      });
      
      const data = await networkResponse.clone().json();
      await storeApiResponseInIndexedDB(url, data);
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Network failed, trying cache:', url.pathname);
    
    const cachedResponse = await caches.match(cacheKey);
    if (cachedResponse) {
      console.log('Serving from cache:', url.pathname);
      return cachedResponse;
    }
    
    const indexedDBData = await getApiResponseFromIndexedDB(url);
    if (indexedDBData) {
      console.log('Serving from IndexedDB:', url.pathname);
      return new Response(JSON.stringify(indexedDBData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return getFallbackResponse(url);
  }
}

async function storeApiResponseInIndexedDB(url, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AgriSmartAICache', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('apiResponses')) {
        db.createObjectStore('apiResponses', { keyPath: 'url' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['apiResponses'], 'readwrite');
      const store = transaction.objectStore('apiResponses');
      
      const item = {
        url: url.pathname,
        data: data,
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      const putRequest = store.put(item);
      
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = (error) => reject(error);
    };
    
    request.onerror = (error) => reject(error);
  });
}

async function getApiResponseFromIndexedDB(url) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AgriSmartAICache', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['apiResponses'], 'readonly');
      const store = transaction.objectStore('apiResponses');
      
      const getRequest = store.get(url.pathname);
      
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item && item.expires > Date.now()) {
          resolve(item.data);
        } else {
          resolve(null);
        }
      };
      
      getRequest.onerror = (error) => reject(error);
    };
    
    request.onerror = (error) => reject(error);
  });
}

function getFallbackResponse(url) {
  const path = url.pathname;
  
  if (path.startsWith('/api/crop/')) {
    const cropName = path.split('/').pop();
    const cropData = getCachedCropData(cropName);
    
    if (cropData) {
      return new Response(JSON.stringify(cropData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  if (path === '/api/crops') {
    const cropsList = getCachedCropsList();
    return new Response(JSON.stringify(cropsList), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({
    success: false,
    error: 'You are offline. Please check your internet connection.',
    offline: true,
    cached: false
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 503
  });
}

function getCachedCropData(cropName) {
  const cropDatabase = {
    rice: {
      name: 'Rice (Paddy)',
      season: 'Kharif/Rabi',
      climate: 'Warm, humid (20-35°C)',
      soil: 'Clayey to silty loams',
      seed_rate: '20-25 kg/ha (transplanting)',
      harvest: '120-150 days'
    },
    wheat: {
      name: 'Wheat',
      season: 'Rabi',
      climate: 'Cool, temperate (10-25°C)',
      soil: 'Well-drained loamy soils',
      seed_rate: '100-125 kg/ha',
      harvest: '140-160 days'
    },
    tomato: {
      name: 'Tomato',
      season: 'Year-round',
      climate: 'Warm (20-30°C)',
      soil: 'Well-drained loam',
      seed_rate: '400-500 g/ha (seedlings)',
      harvest: '70-90 days'
    }
  };
  
  return cropDatabase[cropName.toLowerCase()] || null;
}

function getCachedCropsList() {
  return {
    crops: ['Rice', 'Wheat', 'Maize', 'Tomato', 'Potato', 'Onion'],
    count: 6,
    offline: true
  };
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  console.log('Syncing offline data...');
  
  const offlineRequests = await getOfflineRequests();
  
  for (const request of offlineRequests) {
    try {
      await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      await removeOfflineRequest(request.id);
    } catch (error) {
      console.error('Failed to sync request:', error);
    }
  }
}

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New update from AgriSmart AI',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'AgriSmart AI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          const client = clientList[0];
          client.focus();
          client.postMessage({
            type: 'notification_click',
            data: event.notification.data
          });
        } else {
          clients.openWindow(event.notification.data.url || '/');
        }
      })
  );
});

async function getOfflineRequests() {
  return [];
}

async function removeOfflineRequest(id) {
  return Promise.resolve();
}


