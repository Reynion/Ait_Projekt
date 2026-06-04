importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBmiZsD-ys96DIOsNqnfCERYaTLAV_xqWw',
  authDomain: 'ait-projekt.firebaseapp.com',
  projectId: 'ait-projekt',
  storageBucket: 'ait-projekt.firebasestorage.app',
  messagingSenderId: '920163108526',
  appId: '1:920163108526:web:cf21201030e3890625cf3f',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const { title, body, icon, link } = payload.data ?? {}
  self.registration.showNotification(title ?? 'Ait 놀이터', {
    body: body ?? '',
    icon: icon ?? '/icon.png',
    badge: '/icon.png',
    data: { link: link ?? '/' },
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const link = event.notification.data?.link ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(link)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(link)
    })
  )
})
