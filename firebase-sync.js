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
const KEY = {products:"jk3d_products_v1", settings:"jk3d_settings_v1", orders:"jk3d_orders_v1"};

if (firebaseConfig.apiKey.startsWith("ISI_")) {
  console.warn("Firebase belum dikonfigurasi — berjalan dalam mode lokal.");
  window.dispatchEvent(new Event("jk-nofirebase"));
} else start();

function start() {
  const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getDatabase(app);
  let applying = false, remote = new Map(), subscribed = false, offs = [];
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
  const unlisten = () => { offs.forEach(f => f()); offs = []; subscribed = false; remote = new Map(); };

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
    logout: () => signOut(auth)
  };
}
