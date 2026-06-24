// NailTurn Service Worker - Xử lý Web Push Notification
const CACHE_NAME = 'nailturn-v2';

async function ackNotification(data) {
  try {
    await fetch('/api/push/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId: data?.alertId,
        workerId: data?.workerId
      })
    });
  } catch(e) {}
}

// Nhận push notification từ server
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data.json(); } catch(e) {}

  const title = payload.title || 'Nail Turn 💅';
  const data = payload.data || {};
  const remindNo = payload.remindNo || 0;

  const options = {
    body: payload.body || 'Bạn có ca mới!',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-96.png',
    // Rung mạnh hơn: 3 nhịp dài + kết thúc dài
    vibrate: [600, 180, 600, 180, 900, 250, 1200],
    tag: 'nailturn-alert-' + (data.alertId || data.workerId || 'all'),
    renotify: true,
    requireInteraction: true,
    timestamp: Date.now(),
    data,
    actions: [
      { action: 'ack', title: '✅ Đã nhận' },
      { action: 'open', title: '👀 Mở' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Khi user click vào notification / action
self.addEventListener('notificationclick', event => {
  const data = event.notification.data || {};
  const action = event.action || 'open';

  if (action === 'ack') {
    event.notification.close();
    event.waitUntil(ackNotification(data));
    return;
  }

  // Click notification hoặc nút Mở: cũng tính là đã nhận, rồi mở worker page
  event.notification.close();
  event.waitUntil((async () => {
    await ackNotification(data);
    const url = '/worker.html';
    const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of list) {
      if ('focus' in client) return client.focus();
    }
    return clients.openWindow(url);
  })());
});

// Đóng notification không tính là đã nhận — để server còn nhắc lại
self.addEventListener('notificationclose', () => {});

// Activate SW ngay lập tức
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
