// ============================================================
//  WARUNGKU — Sinkronisasi Firebase (Realtime Database)
//  1) firebaseConfig di bawah sudah terisi (proyek warungku-f57fe)
//  2) Dipakai bersama oleh index.html (pelanggan) dan admin.html
// ============================================================
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,onAuthStateChanged,signInAnonymously,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getDatabase,ref,set,get,remove,onValue,query,orderByChild,equalTo} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvX3WWZQcuZFwiWzn3Syzg9gtWpkhoWq0",
  authDomain: "warungku-f57fe.firebaseapp.com",
  databaseURL: "https://warungku-f57fe-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "warungku-f57fe",
  appId: "1:673408074768:web:aed0ac7d91cb2676037695"
};

const ADMIN = window.JK_ROLE === "admin";
const KEY = {products:"jk3d_products_v1", settings:"jk3d_settings_v1", orders:"jk3d_orders_v1", chats:"jk3d_chats_v1", reviews:"jk3d_reviews_v1"};

if (firebaseConfig.apiKey.startsWith("ISI_")) {
  console.warn("Firebase belum dikonfigurasi — berjalan dalam mode lokal.");
  window.dispatchEvent(new Event("jk-nofirebase"));
} else start();

function start() {
  const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getDatabase(app);
  let applying = false, remote = new Map(), subscribed = false, offs = [];
  let remoteChat = new Set(), remoteRev = new Map();
  const warn = e => { console.warn(e); window.toast && window.toast("Gagal sinkron: " + (e.code || e.message)); };

  // Tulis hasil dari server ke cache lokal lalu beri tahu halaman
  const apply = (k, val) => {
    const s = JSON.stringify(val);
    if (localStorage.getItem(k) === s) return;
    applying = true; try { localStorage.setItem(k, s); } finally { applying = false; }
    dispatchEvent(new StorageEvent("storage", {key:k}));
  };

  // Setiap perubahan lokal pada 3 data utama otomatis dikirim ke server
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    orig.call(this, k, v);
    if (this === localStorage && !applying) push(k, v);
  };
  function push(k, v) {
    const u = auth.currentUser; if (!u) return;
    let d; try { d = JSON.parse(v); } catch (e) { return; }
    if (k === KEY.orders && Array.isArray(d)) {
      const ids = new Set(d.map(o => o && o.id));
      for (const o of d) {
        if (!o || !o.id) continue;
        const s = JSON.stringify(o);
        if (ADMIN) { if (remote.get(o.id) !== s) set(ref(db, "orders/" + o.id), JSON.parse(s)).catch(warn); }
        else if (!remote.has(o.id)) set(ref(db, "orders/" + o.id), {...JSON.parse(s), uid:u.uid}).catch(warn);
      }
      if (ADMIN) for (const id of remote.keys()) if (!ids.has(id)) remove(ref(db, "orders/" + id)).catch(warn);
    } else if (ADMIN && (k === KEY.products || k === KEY.settings)) {
      set(ref(db, k === KEY.products ? "products" : "settings"), d).catch(warn);
    } else if (k === KEY.chats && Array.isArray(d)) {
      // Obrolan: pesan tidak pernah diubah, jadi cukup kirim pesan yang belum ada di server.
      for (const m of d) {
        if (!m || !m.id || !m.cid || remoteChat.has(m.id)) continue;
        const mine = ADMIN ? m.from === "admin" : (m.from === "customer" && m.cid === u.uid);
        if (mine) set(ref(db, "chats/" + m.cid + "/" + m.id), m).catch(warn);
      }
    } else if (k === KEY.reviews && Array.isArray(d)) {
      const ids = new Set(d.map(r => r && r.id));
      for (const r of d) {
        if (!r || !r.id) continue;
        const s2 = JSON.stringify(r);
        if (ADMIN) { if (remoteRev.get(r.id) !== s2) set(ref(db, "reviews/" + r.id), JSON.parse(s2)).catch(warn); }
        else if (r.uid === u.uid && !remoteRev.has(r.id)) set(ref(db, "reviews/" + r.id), JSON.parse(s2)).catch(warn);
      }
      if (ADMIN) for (const id of remoteRev.keys()) if (!ids.has(id)) remove(ref(db, "reviews/" + id)).catch(warn);
    }
  }

  function listen() {
    if (subscribed) return; subscribed = true;
    const u = auth.currentUser;
    offs.push(onValue(ref(db, "products"), s => {
      const v = s.val();
      if (v == null) { ADMIN && window.seedRemote && window.seedRemote("p"); return; }
      apply(KEY.products, Object.values(v));
    }, warn));
    offs.push(onValue(ref(db, "settings"), s => {
      const v = s.val();
      if (v == null) { ADMIN && window.seedRemote && window.seedRemote("s"); return; }
      apply(KEY.settings, v);
    }, warn));
    // Obrolan: admin membaca semua percakapan, pelanggan hanya percakapannya sendiri
    offs.push(onValue(ADMIN ? ref(db, "chats") : ref(db, "chats/" + u.uid), s => {
      const arr = [];
      remoteChat = new Set();
      const add = c => { const v = c.val(); if (v && v.id) { remoteChat.add(v.id); arr.push(v); } };
      if (ADMIN) s.forEach(th => { th.forEach(add); }); else s.forEach(add);
      try { for (const m of JSON.parse(localStorage.getItem(KEY.chats) || "[]"))
        if (m && !remoteChat.has(m.id) && Date.now() - m.t < 12e4 && m.from === (ADMIN ? "admin" : "customer")) arr.push(m); } catch (e) {}
      arr.sort((a, b) => a.t - b.t);
      apply(KEY.chats, arr);
    }, warn));
    // Ulasan: terbuka untuk semua pengunjung
    offs.push(onValue(ref(db, "reviews"), s => {
      remoteRev = new Map(); const arr = [];
      s.forEach(c => { const v = c.val(); if (v && v.id) { remoteRev.set(v.id, JSON.stringify(v)); arr.push(v); } });
      if (!ADMIN) {
        try { for (const r of JSON.parse(localStorage.getItem(KEY.reviews) || "[]"))
          if (r && !remoteRev.has(r.id) && Date.now() - r.t < 12e4) arr.push(r); } catch (e) {}
      }
      arr.sort((a, b) => b.t - a.t);
      apply(KEY.reviews, arr);
    }, warn));
    const q = ADMIN ? ref(db, "orders") : query(ref(db, "orders"), orderByChild("uid"), equalTo(u.uid));
    offs.push(onValue(q, s => {
      remote = new Map(); const arr = [];
      s.forEach(c => { const v = c.val(); remote.set(v.id || c.key, JSON.stringify(v)); arr.push(v); });
      if (!ADMIN) { // pertahankan pesanan yang baru dibuat dan belum terkirim
        try { for (const o of JSON.parse(localStorage.getItem(KEY.orders) || "[]"))
          if (o && !remote.has(o.id) && Date.now() - new Date(o.date) < 12e4) arr.push(o); } catch (e) {}
      }
      arr.sort((a, b) => new Date(b.date) - new Date(a.date));
      apply(KEY.orders, arr);
    }, warn));
  }
  const unlisten = () => { offs.forEach(f => f()); offs = []; subscribed = false; remote = new Map(); remoteChat = new Set(); remoteRev = new Map(); };

  onAuthStateChanged(auth, u => {
    if (ADMIN) {
      if (u && !u.isAnonymous) { listen(); dispatchEvent(new Event("jk-admin-in")); }
      else { unlisten(); dispatchEvent(new Event("jk-admin-out")); }
    } else if (!u) signInAnonymously(auth).catch(warn);
    else { unlisten(); listen(); }
  });

  // Daftar / masuk akun (Gmail atau nomor WhatsApp)
  const nw = p => { p = String(p).replace(/\D/g, ""); return p[0] === "0" ? "62" + p.slice(1) : p[0] === "8" ? "62" + p : p; };
  window.JK = {
    async register(email, pass, prof) {
      const c = await createUserWithEmailAndPassword(auth, email, pass);
      await set(ref(db, "users/" + c.user.uid), {...prof, email, role: ADMIN ? "admin" : "customer"});
      await set(ref(db, "phones/" + nw(prof.wa)), email);
      return prof;
    },
    async login(id, pass) {
      let email = String(id).trim();
      if (!email.includes("@")) {
        const s = await get(ref(db, "phones/" + nw(email)));
        if (!s.exists()) throw {code: "auth/user-not-found"};
        email = s.val();
      }
      const c = await signInWithEmailAndPassword(auth, email, pass);
      const s = await get(ref(db, "users/" + c.user.uid));
      return {...(s.val() || {}), email};
    },
    logout: () => signOut(auth),
    uid: () => (auth.currentUser ? auth.currentUser.uid : null)
  };
}
