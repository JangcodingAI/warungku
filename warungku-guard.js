/* WARUNGKU Guard — sensor keamanan ringan. Memblokir skrip/iframe asing, mendeteksi clickjacking
   dan serangan tebak kata sandi, lalu melapor ke Pusat lewat JK.report (firebase-sync.js). */
(() => {
"use strict";
const HOSTS = /(^|\.)(unpkg\.com|jsdelivr\.net|gstatic\.com|googleapis\.com|cdnjs\.cloudflare\.com|openstreetmap\.org|firebaseio\.com|firebaseapp\.com)$/;
const ok = u => { try { const x = new URL(u, location.href); return x.origin === location.origin || HOSTS.test(x.hostname) } catch (e) { return false } };
const q = []; let sent = [], tries = 0;
function flush() {
  if (!window.JK || !JK.report) return tries++ < 40 && setTimeout(flush, 1500);
  while (q.length) JK.report(q.shift());
}
function rep(type, sev, msg) {
  const n = Date.now(); sent = sent.filter(t => n - t < 6e4); if (sent.length >= 8) return;
  sent.push(n);
  q.push({ t: n, type, sev, msg: String(msg).slice(0, 200), role: window.JK_ROLE || "web", ua: navigator.userAgent.slice(0, 90), status: "open" });
  flush();
}

/* 1. Skrip / iframe / form asing yang disisipkan ke halaman */
function check(el) {
  if (el.nodeType !== 1) return;
  const t = el.tagName;
  if (t === "SCRIPT" && (el.src ? !ok(el.src) : document.readyState === "complete")) { el.remove(); rep("script-injection", 3, "Skrip diblokir: " + (el.src || "inline")); return; }
  if ((t === "IFRAME" || t === "OBJECT" || t === "EMBED") && !ok(el.src || el.data || location.href)) { el.remove(); rep("script-injection", 3, t + " asing diblokir: " + (el.src || el.data)); return; }
  if (t === "FORM" && el.action && !ok(el.action)) { el.remove(); rep("link-asing", 2, "Form ke situs asing: " + el.action); return; }
  if (t === "A" && /^\s*javascript:/i.test(el.getAttribute("href") || "")) { el.removeAttribute("href"); rep("link-asing", 1, "Tautan javascript: dinetralkan"); }
  el.querySelectorAll && el.querySelectorAll("script,iframe,object,embed,form,a[href^='javascript:' i]").forEach(check);
}
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(check))).observe(document.documentElement, { childList: true, subtree: true });

/* 2. Clickjacking: halaman dibuka di dalam frame situs lain */
if (top !== self) { rep("frame", 3, "Halaman dimuat di dalam frame: " + document.referrer); try { top.location = location.href } catch (e) { document.documentElement.innerHTML = "" } }

/* 3. Tebak kata sandi: 5 gagal / 10 menit → kunci 60 detik */
const K = "wk_fail";
const get = () => { try { return JSON.parse(localStorage.getItem(K)) || { n: 0, t: 0, until: 0 } } catch (e) { return { n: 0, t: 0, until: 0 } } };
window.WKG = {
  locked() { const s = get(), r = Math.ceil((s.until - Date.now()) / 1e3); return r > 0 ? r : 0 },
  fail(id) {
    const s = get(), n = Date.now(); if (n - s.t > 6e5) s.n = 0;
    s.n++; s.t = n;
    if (s.n >= 5) { s.until = n + 6e4; s.n = 0; rep("brute-force", 2, "5 kali gagal masuk untuk " + String(id).replace(/(.{2}).+(@.*)?/, "$1***$2")); }
    try { localStorage.setItem(K, JSON.stringify(s)) } catch (e) {}
  }
};
/* 4. Info perangkat, jaringan & lokasi — hanya setelah pengguna mengizinkan */
const GK = "wk_geo";
const best = () => new Promise(res => {
  if (!navigator.geolocation) return res(null);
  let b = null, id; const done = () => { navigator.geolocation.clearWatch(id); clearTimeout(tm); res(b); }, tm = setTimeout(done, 15000);
  id = navigator.geolocation.watchPosition(p => {
    const c = p.coords;
    if (!b || c.accuracy < b.acc) b = { lat: +c.latitude.toFixed(6), lng: +c.longitude.toFixed(6), acc: Math.round(c.accuracy) };
    if (c.accuracy <= 20) done();
  }, () => done(), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
});
async function collect() {
  const ua = navigator.userAgent, d = { ua: ua.slice(0, 160), screen: screen.width + "x" + screen.height + "@" + (devicePixelRatio || 1), lang: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
  const c = navigator.connection; if (c) d.net = { type: c.type || "", eff: c.effectiveType || "", down: c.downlink, rtt: c.rtt, save: !!c.saveData };
  try { const h = await navigator.userAgentData.getHighEntropyValues(["model", "platformVersion", "platform"]); d.model = h.model || ""; d.os = ((h.platform || "") + " " + (h.platformVersion || "")).trim(); } catch (e) {}
  d.model = d.model || (ua.match(/;\s*([^;)]+?)\s+Build\//) || [])[1] || (/iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : "");
  d.os = d.os || (ua.match(/(Android [\d.]+|iPhone OS [\d_]+|Windows NT [\d.]+|Mac OS X [\d_]+)/) || [])[1] || "";
  d.browser = (ua.match(/(Edg|OPR|Firefox|Chrome|Safari)\/[\d.]+/) || [])[0] || "";
  try { d.ip = (await (await fetch("https://api.ipify.org?format=json")).json()).ip; } catch (e) {}
  d.loc = await best();
  return d;
}
async function send() { const d = await collect(), go = () => window.JK && JK.device ? JK.device(d) : tries++ < 60 && setTimeout(go, 1500); go(); }
function consent() {
  const b = document.createElement("div"), s = "border:0;border-radius:12px;padding:10px 16px;font-weight:800;cursor:pointer;";
  b.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9998;max-width:460px;margin:auto;background:#1a110a;color:#fff;border-radius:18px;padding:16px;font:13px/1.5 system-ui,sans-serif;box-shadow:0 14px 40px #0009";
  b.innerHTML = '<b style="font-size:15px">Amankan akunmu</b><div style="margin:4px 0 12px;color:#e9d8c3">Izinkan WARUNGKU membaca lokasi, jenis perangkat, dan jaringan. Data hanya dilihat pusat untuk keamanan akun. Bisa dicabut kapan saja di pengaturan peramban.</div><div style="display:flex;gap:8px"><button id="gy" style="' + s + 'background:#f08a1c;color:#2b1500">Izinkan</button><button id="gn" style="' + s + 'background:#ffffff1a;color:#fff">Nanti</button></div>';
  document.body.appendChild(b);
  b.querySelector("#gy").onclick = () => { localStorage.setItem(GK, "1"); b.remove(); send(); };
  b.querySelector("#gn").onclick = () => { sessionStorage.setItem(GK, "skip"); b.remove(); };
}
addEventListener("load", () => setTimeout(() => {
  if (!(localStorage.getItem("wk_ses_admin") || localStorage.getItem("wk_ses_customer"))) return;
  const g = localStorage.getItem(GK);
  if (g === "1") send(); else if (!g && !sessionStorage.getItem(GK)) consent();
}, 2500));
navigator.connection && navigator.connection.addEventListener("change", () => localStorage.getItem(GK) === "1" && send());
})();
