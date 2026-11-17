// プッシュ通知を受け取って表示する（hibitool）
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "お知らせ", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "お知らせ", {
    body: d.body || "", icon: d.icon, badge: d.icon, tag: d.tag, renotify: true, data: { url: d.url || self.registration.scope }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope) && "focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});