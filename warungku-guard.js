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
})();
