/**
 * Service Worker for ScoreDesk Background Sync
 * Handles background synchronization, offline support, and push notifications
 */

const CACHE_NAME = 'scoredesk-v1'
const SYNC_TAG = 'background-sync'
const NOTIFICATION_TAG = 'scoredesk-notification'

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first for static assets
  CACHE_FIRST: 'cache-first',
  // Network first for API calls
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate for dynamic content
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
}

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching essential resources')
        return cache.addAll([
          '/',
          '/offline.html',
          '/manifest.json'
        ])
      })
      .then(() => {
        console.log('[SW] Installation complete')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Activation complete')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first with cache fallback
    event.respondWith(handleApiRequest(request))
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - cache first
    event.respondWith(handleStaticAsset(request))
  } else if (url.pathname.startsWith('/')) {
    // Page requests - stale while revalidate
    event.respondWith(handlePageRequest(request))
  }
})

// Handle API requests with network first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url)
    
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No internet connection available' 
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
}

// Handle static assets with cache first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url)
    throw error
  }
}

// Handle page requests with stale while revalidate strategy
async function handlePageRequest(request) {
  const cachedResponse = await caches.match(request)
  
  // Always try to fetch from network
  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(CACHE_NAME)
        cache.then((c) => c.put(request, response.clone()))
      }
      return response
    })
    .catch(() => null)
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Otherwise wait for network
  const networkResponse = await networkFetch
  if (networkResponse) {
    return networkResponse
  }
  
  // Fallback to offline page
  return caches.match('/offline.html')
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(performBackgroundSync())
  }
})

// Perform background synchronization
async function performBackgroundSync() {
  try {
    console.log('[SW] Starting background sync')
    
    // Get pending sync items from IndexedDB
    const pendingItems = await getPendingSyncItems()
    
    if (pendingItems.length === 0) {
      console.log('[SW] No pending items to sync')
      return
    }
    
    console.log(`[SW] Syncing ${pendingItems.length} items`)
    
    // Process items in batches
    const batchSize = 5
    for (let i = 0; i < pendingItems.length; i += batchSize) {
      const batch = pendingItems.slice(i, i + batchSize)
      await syncBatch(batch)
    }
    
    console.log('[SW] Background sync completed')
    
    // Notify clients about sync completion
    await notifyClients('sync-completed', { 
      syncedItems: pendingItems.length 
    })
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
    
    // Notify clients about sync failure
    await notifyClients('sync-failed', { 
      error: error.message 
    })
  }
}

// Sync a batch of items
async function syncBatch(items) {
  const promises = items.map(item => syncItem(item))
  const results = await Promise.allSettled(promises)
  
  // Update item statuses
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const result = results[i]
    
    if (result.status === 'fulfilled') {
      await updateSyncItemStatus(item.id, 'completed')
    } else {
      await updateSyncItemStatus(item.id, 'failed', result.reason?.message)
    }
  }
}

// Sync a single item
async function syncItem(item) {
  const url = `/api/${item.type}`
  const options = {
    method: item.operation === 'delete' ? 'DELETE' : 
             item.operation === 'update' ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: item.operation !== 'delete' ? JSON.stringify(item.data) : undefined
  }
  
  if (item.operation === 'update' || item.operation === 'delete') {
    options.url = `${url}/${item.data.id}`
  }
  
  const response = await fetch(url, options)
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

// Get pending sync items from IndexedDB
async function getPendingSyncItems() {
  try {
    // Open IndexedDB
    const request = indexedDB.open('ScoreDeskOffline', 1)
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['sync_queue'], 'readonly')
        const store = transaction.objectStore('sync_queue')
        const getAllRequest = store.getAll()
        
        getAllRequest.onsuccess = () => {
          const items = getAllRequest.result
            .map(item => item.data)
            .filter(item => item.status === 'pending')
            .sort((a, b) => a.timestamp - b.timestamp)
          
          resolve(items)
        }
        
        getAllRequest.onerror = () => {
          reject(getAllRequest.error)
        }
      }
      
      request.onerror = () => {
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[SW] Failed to get pending sync items:', error)
    return []
  }
}

// Update sync item status in IndexedDB
async function updateSyncItemStatus(itemId, status, error) {
  try {
    const request = indexedDB.open('ScoreDeskOffline', 1)
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['sync_queue'], 'readwrite')
        const store = transaction.objectStore('sync_queue')
        
        const getRequest = store.get(itemId)
        
        getRequest.onsuccess = () => {
          const item = getRequest.result
          if (item) {
            item.data.status = status
            item.data.lastError = error
            item.data.lastSyncAttempt = Date.now()
            
            const putRequest = store.put(item)
            
            putRequest.onsuccess = () => resolve()
            putRequest.onerror = () => reject(putRequest.error)
          } else {
            resolve()
          }
        }
        
        getRequest.onerror = () => {
          reject(getRequest.error)
        }
      }
      
      request.onerror = () => {
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[SW] Failed to update sync item status:', error)
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  if (!event.data) {
    return
  }
  
  try {
    const data = event.data.json()
    const options = {
      body: data.body || 'New notification from ScoreDesk',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: NOTIFICATION_TAG,
      data: data.data,
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'ScoreDesk', options)
    )
  } catch (error) {
    console.error('[SW] Failed to handle push notification:', error)
  }
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked')
  
  event.notification.close()
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            if (urlToOpen !== '/') {
              client.navigate(urlToOpen)
            }
            return
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// Message event - communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  const { type, data } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'REGISTER_BACKGROUND_SYNC':
      registerBackgroundSync()
      break
      
    case 'CACHE_MATCH_DATA':
      cacheMatchData(data)
      break
      
    case 'GET_SYNC_STATUS':
      getSyncStatus().then(status => {
        event.ports[0]?.postMessage({ type: 'SYNC_STATUS', data: status })
      })
      break
      
    default:
      console.log('[SW] Unknown message type:', type)
  }
})

// Register background sync
async function registerBackgroundSync() {
  try {
    await self.registration.sync.register(SYNC_TAG)
    console.log('[SW] Background sync registered')
  } catch (error) {
    console.error('[SW] Failed to register background sync:', error)
  }
}

// Cache match data for offline access
async function cacheMatchData(matchData) {
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = new Response(JSON.stringify(matchData), {
      headers: { 'Content-Type': 'application/json' }
    })
    
    await cache.put(`/api/matches/${matchData.id}`, response)
    console.log('[SW] Match data cached:', matchData.id)
  } catch (error) {
    console.error('[SW] Failed to cache match data:', error)
  }
}

// Get sync status
async function getSyncStatus() {
  try {
    const pendingItems = await getPendingSyncItems()
    return {
      pendingItems: pendingItems.length,
      lastSync: Date.now() // Simplified - would track actual last sync time
    }
  } catch (error) {
    console.error('[SW] Failed to get sync status:', error)
    return { pendingItems: 0, lastSync: null }
  }
}

// Notify all clients
async function notifyClients(type, data) {
  try {
    const clients = await self.clients.matchAll()
    
    clients.forEach(client => {
      client.postMessage({ type, data })
    })
  } catch (error) {
    console.error('[SW] Failed to notify clients:', error)
  }
}

// Periodic background sync (fallback for browsers that don't support background sync)
setInterval(async () => {
  if (await self.registration.sync) {
    // Background sync is supported, no need for periodic sync
    return
  }
  
  // Perform periodic sync as fallback
  console.log('[SW] Performing periodic sync')
  await performBackgroundSync()
}, 5 * 60 * 1000) // Every 5 minutes

console.log('[SW] Service worker script loaded')