self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Do It Now', body: 'タスクの時間です！' };

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200], // バイブレーション
    tag: 'do-it-now-task',     // 同じタグの通知は上書きされ、最新がポップアップしやすくなる
    renotify: true,            // 上書き時も再度バイブやポップアップを促す
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
