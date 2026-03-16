// Service Worker Version: v3 (Force update with requireInteraction)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Do It Now', body: 'タスクの時間です！' };

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'do-it-now-task',
    renotify: true,
    timestamp: Date.now(),
    requireInteraction: true, // ユーザーが触るまで消さない（優先度向上）
    actions: [
      { action: 'open', title: 'アプリを開く' }
    ],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
