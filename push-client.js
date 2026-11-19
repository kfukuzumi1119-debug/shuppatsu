/* ---- プッシュ通知（共通部品。各ページに埋め込み。PUSH_APP・pushPayload()・pushDesc()・pushReady() はページ側で定義） ---- */
const PUSH_API = "https://push.hibitool.com";
const pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const pushIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const pushStandalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
let pushOn = false;
try { pushOn = localStorage.getItem(PUSH_APP + "-push") === "1"; } catch (e) {}
function pushU8(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; const b = atob(s); return Uint8Array.from(b, c => c.charCodeAt(0)); }
async function pushSub(create) {
  const reg = await navigator.serviceWorker.register(window.PUSH_SW || "sw.js");  // 都市ページなどでは window.PUSH_SW="../sw.js"
  await navigator.serviceWorker.ready;
  let s = await reg.pushManager.getSubscription();
  if (!s && create) {
    const k = await fetch(PUSH_API + "/vapid").then(r => r.json());
    s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pushU8(k.key) });
  }
  return s;
}
async function pushPost(path, create) {
  const s = await pushSub(create);
  if (!s) throw new Error("通知が登録されていません");
  const body = Object.assign({ app: PUSH_APP, sub: s.toJSON() }, path === "/unsubscribe" ? {} : pushPayload());
  const res = await fetch(PUSH_API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(j.error || ("status " + res.status));
  return j;
}
function pushSetFlag(v) { pushOn = v; try { localStorage.setItem(PUSH_APP + "-push", v ? "1" : "0"); } catch (e) {} }
function pushMsg(t) { const el = document.getElementById("pushMsg"); if (el) el.textContent = t; }
function pushUI() {
  const st = document.getElementById("pushState"), on = document.getElementById("pushOn"), test = document.getElementById("pushTest"), off = document.getElementById("pushOff"), ios = document.getElementById("pushIos");
  ios.classList.toggle("hide", !(pushIOS && !pushStandalone));
  if (!pushSupported) {
    st.textContent = pushIOS && !pushStandalone ? "iPhone・iPad で通知を受け取るには、先にホーム画面に追加してください。" : "このブラウザは通知に対応していません。Chrome・Edge・Firefox、または iPhone はホーム画面に追加して使ってください。";
    [on, test, off].forEach(b => b.classList.add("hide"));
    return;
  }
  st.innerHTML = pushOn ? "<b>通知オン</b>：" + pushDesc() : "通知はオフです。オンにすると、" + pushDesc();
  on.classList.toggle("hide", pushOn);
  test.classList.toggle("hide", !pushOn);
  off.classList.toggle("hide", !pushOn);
}
function pushSync() {
  pushUI();
  if (!pushOn || !pushSupported) return;
  clearTimeout(pushSync.t);
  pushSync.t = setTimeout(() => pushPost("/subscribe", false).catch(() => {}), 1200);
}
document.getElementById("pushOn").onclick = async () => {
  const why = pushReady(); if (why) { pushMsg(why); return; }
  pushMsg("設定しています…");
  try {
    const p = await Notification.requestPermission();
    if (p !== "granted") { pushMsg("通知が許可されませんでした。ブラウザの設定で、このサイトの通知を「許可」にしてください。"); return; }
    await pushPost("/subscribe", true);
    pushSetFlag(true); pushUI(); pushMsg("オンにしました。「テスト通知」で届くか確かめられます。");
  } catch (e) { pushMsg("うまくいきませんでした（" + e.message + "）。少し時間をおいてもう一度お試しください。"); }
};
document.getElementById("pushTest").onclick = async () => {
  pushMsg("送っています…");
  try { await pushPost("/subscribe", true); await pushPost("/test", true); pushMsg("送りました。数秒〜1分ほどで届きます。"); }
  catch (e) { pushMsg("送れませんでした（" + e.message + "）"); }
};
document.getElementById("pushOff").onclick = async () => {
  pushMsg("オフにしています…");
  try { await pushPost("/unsubscribe", false); } catch (e) {}
  try { const s = await pushSub(false); if (s) await s.unsubscribe(); } catch (e) {}
  pushSetFlag(false); pushUI(); pushMsg("オフにしました。");
};
pushUI();
if (pushOn && pushSupported) pushSync();
