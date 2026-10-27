/* WARUNGKU — Intro, Daftar & Masuk (dipakai index.html dan admin.html)
   Pakai: <script src="warungku-auth.js" data-role="customer|admin"></script> di akhir <body>.
   Mode lokal (tanpa Firebase): akun tersimpan di perangkat. Mode Firebase: akun dibuat di cloud. */
(() => {
"use strict";
const SC = document.currentScript, ADM = SC.dataset.role === "admin", ROLE = ADM ? "admin" : "customer";
const LS = localStorage, AK = "wk_acc_" + ROLE, SK = "wk_ses_" + ROLE, SET = "jk3d_settings_v1", PRO = "jk3d_profile_v1";
const rd = (k, f) => { try { const v = JSON.parse(LS.getItem(k)); return v ?? f } catch (e) { return f } };
const wr = (k, v) => { try { LS.setItem(k, JSON.stringify(v)); return true } catch (e) { return false } };
const $ = id => document.getElementById(id);
const nw = p => { p = String(p).replace(/\D/g, ""); return p[0] === "0" ? "62" + p.slice(1) : p[0] === "8" ? "62" + p : p };
const sha = async s => { try { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("wk:" + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("") } catch (e) { return "x" + btoa(unescape(encodeURIComponent(s))) } };

/* ---------- Branding toko (nama + logo) ---------- */
function brand() {
  const s = rd(SET, {});
  if (s.logo) document.querySelectorAll(".brand-mark,.crumb .mark").forEach(m => m.innerHTML = '<img alt="" src="' + s.logo + '">');
  if (s.shopName && s.shopName !== "WARUNGKU") {
    document.querySelectorAll(".brand-name,#crumbName").forEach(e => e.textContent = s.shopName);
    document.title = s.shopName + " — WARUNGKU";
  }
}
addEventListener("storage", e => e.key === SET && brand());
brand();

/* ---------- Keluar ---------- */
async function logout() {
  LS.removeItem(SK);
  try { window.JK && await JK.logout() } catch (e) {}
  location.reload();
}

/* ---------- Sudah masuk → langsung ke aplikasi ---------- */
if (rd(SK, null)) {
  document.documentElement.classList.remove("wk-lock");
  if (ADM) {
    document.addEventListener("click", e => {
      if (e.target.closest('[data-act="logout"]')) { e.stopImmediatePropagation(); e.preventDefault(); logout(); }
    }, true);
    const go = () => typeof enter === "function" && enter();
    addEventListener("jk-nofirebase", () => setTimeout(go, 0));
    addEventListener("jk-admin-out", () => { LS.removeItem(SK); location.reload(); });
  } else {
    const f = $("profileForm");
    if (f) f.insertAdjacentHTML("afterend", '<button type="button" class="wk-out" id="wkOut">⎋ Keluar dari akun</button>');
    $("wkOut")?.addEventListener("click", () => confirm("Keluar dari akun ini?") && logout());
  }
  return;
}

/* ---------- Belum masuk → Intro, Daftar, Masuk ---------- */
const hasAcc = rd(AK, []).length > 0;
const fld = (id, label, type, ph, extra = "") =>
  `<div class="wk-f"><label for="${id}">${label}</label><input id="${id}" type="${type}" placeholder="${ph}" ${extra}></div>`;
const pw = (id, label, ac) =>
  `<div class="wk-f"><label for="${id}">${label}</label><div class="wk-pw"><input id="${id}" type="password" autocomplete="${ac}" placeholder="Minimal 6 karakter"><button type="button" data-eye="${id}" aria-label="Lihat kata sandi">👁</button></div></div>`;
const regFields = (ADM
  ? `<div class="wk-up"><label class="wk-ph" id="rLogoBox"><input id="rLogo" type="file" accept="image/*" hidden><span id="rLogoPrev">📷</span></label><div><b>Logo warung</b><small>Ketuk lingkaran untuk unggah</small></div></div>`
    + fld("rName", "Nama warung", "text", "Contoh: Warung Bu Siti", 'autocomplete="organization"')
  : fld("rName", "Nama lengkap", "text", "Nama kamu", 'autocomplete="name"'))
  + fld("rAddr", "Alamat", "text", ADM ? "Alamat warung" : "Alamat pengantaran", 'autocomplete="street-address"')
  + fld("rWa", "Nomor WhatsApp", "tel", "08xxxxxxxxxx", 'inputmode="tel" autocomplete="tel"')
  + fld("rEmail", "Gmail", "email", "nama@gmail.com", 'autocomplete="email" inputmode="email"')
  + pw("rPass", "Kata sandi", "new-password");

const root = document.createElement("div");
root.id = "wk-auth";
root.innerHTML = `
<section class="wk-s wk-intro" data-s="intro">
  <img class="wk-logo" src="logo.png" alt="WARUNGKU Jajanan Kampung">
  <h1>${ADM ? "Kelola warungmu,<br>lebih mudah." : "Jajanan kampung,<br>diantar ke rumah."}</h1>
  <p class="wk-sub">${ADM ? "Terima pesanan, atur menu, dan pantau penjualan dari satu tempat." : "Seblak, sosis bakar, aneka cemilan & minuman segar. Rasa sederhana, bikin bahagia."}</p>
  <div class="wk-chips"><span>🍜 Seblak</span><span>🌭 Sosis Bakar</span><span>🍟 Cemilan</span><span>🥤 Minuman</span></div>
  <button class="wk-btn" data-go="${hasAcc ? "log" : "reg"}">${ADM ? "Mulai sebagai penjual" : "Mulai"}</button>
  ${hasAcc ? '<button class="wk-lnk" data-go="reg">Belum punya akun? <b>Daftar</b></button>' : ""}
</section>
<section class="wk-s" data-s="reg">
  <img class="wk-logo sm" src="logo.png" alt="">
  <form class="wk-card" id="fReg" novalidate>
    <h2>${ADM ? "Daftar Penjual" : "Buat Akun"}</h2><p class="wk-sub dk">${ADM ? "Lengkapi data warungmu." : "Daftar sekali, pesan kapan saja."}</p>
    ${regFields}
    <div class="wk-err" id="eReg" role="alert"></div>
    <button class="wk-btn" id="bReg">Daftar</button>
    <button type="button" class="wk-lnk dk" data-go="log">Sudah punya akun? <b>Masuk</b></button>
  </form>
</section>
<section class="wk-s" data-s="log">
  <img class="wk-logo sm" src="logo.png" alt="">
  <form class="wk-card" id="fLog" novalidate>
    <h2>${ADM ? "Masuk Admin" : "Selamat Datang"}</h2><p class="wk-sub dk">Masuk dengan Gmail atau nomor WhatsApp.</p>
    ${fld("lId", "Gmail / Nomor WhatsApp", "text", "nama@gmail.com atau 08xx", 'autocomplete="username" autocapitalize="none"')}
    ${pw("lPass", "Kata sandi", "current-password").replace("Minimal 6 karakter", "Kata sandi")}
    <div class="wk-err" id="eLog" role="alert"></div>
    <button class="wk-btn" id="bLog">Masuk</button>
    <button type="button" class="wk-lnk dk" data-go="reg">Belum punya akun? <b>Daftar</b></button>
  </form>
</section>`;
document.body.appendChild(root);

const show = n => { root.querySelectorAll(".wk-s").forEach(s => s.classList.toggle("on", s.dataset.s === n)); root.scrollTop = 0; };
show("intro");
root.addEventListener("click", e => {
  const g = e.target.closest("[data-go]"); if (g) show(g.dataset.go);
  const y = e.target.closest("[data-eye]");
  if (y) { const i = $(y.dataset.eye); i.type = i.type === "password" ? "text" : "password"; }
});

/* Unggah logo → perkecil ke 256px */
let logo = "";
if (ADM) $("rLogo").addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image(), u = URL.createObjectURL(f);
  img.onload = () => {
    const c = document.createElement("canvas"), r = Math.min(256 / img.width, 256 / img.height, 1);
    c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    logo = c.toDataURL("image/webp", .85); URL.revokeObjectURL(u);
    $("rLogoPrev").innerHTML = '<img alt="" src="' + logo + '">';
  };
  img.src = u;
});

const fbErr = e => {
  const c = e && (e.code || ""), m = {
    "auth/email-already-in-use": "Gmail ini sudah terdaftar. Silakan masuk.",
    "auth/weak-password": "Kata sandi minimal 6 karakter.",
    "auth/invalid-email": "Format Gmail belum benar.",
    "auth/network-request-failed": "Tidak ada koneksi internet."
  };
  if (m[c]) return m[c];
  if (/invalid|wrong|user-not|credential/.test(c)) return "Gmail/nomor atau kata sandi salah.";
  return "Gagal: " + (c || (e && e.message) || "coba lagi");
};
const busy = (b, on, t) => { b.disabled = on; b.textContent = on ? "Mohon tunggu…" : t; };

function finish(a) {
  wr(SK, { email: a.email, t: Date.now() });
  if (ADM) {
    const s = rd(SET, {});
    wr(SET, { ...s, shopName: a.shop || s.shopName, whatsapp: a.wa || s.whatsapp, address: a.address || s.address, logo: a.logo || s.logo || "" });
  } else {
    const p = rd(PRO, {});
    wr(PRO, { ...p, name: a.name || p.name || "", phone: a.phone || a.wa || p.phone || "", address: a.address || p.address || "" });
  }
  location.reload();
}

$("fReg").addEventListener("submit", async e => {
  e.preventDefault();
  const v = id => $(id).value.trim(), b = $("bReg"), er = $("eReg");
  const a = { name: v("rName"), shop: ADM ? v("rName") : "", address: v("rAddr"), phone: v("rWa"), wa: nw(v("rWa")), email: v("rEmail").toLowerCase(), logo: ADM ? logo : "" };
  const pass = $("rPass").value;
  er.textContent = "";
  if (!a.name) return er.textContent = ADM ? "Nama warung wajib diisi." : "Nama wajib diisi.";
  if (!a.address) return er.textContent = "Alamat wajib diisi.";
  if (a.wa.length < 10 || a.wa.length > 15) return er.textContent = "Nomor WhatsApp belum benar.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) return er.textContent = "Format Gmail belum benar.";
  if (pass.length < 6) return er.textContent = "Kata sandi minimal 6 karakter.";
  busy(b, true);
  try {
    if (window.JK && JK.register) {
      const { logo: _l, ...prof } = a;
      await JK.register(a.email, pass, prof);
    } else {
      const list = rd(AK, []);
      if (list.some(x => x.email === a.email || x.wa === a.wa)) throw { code: "auth/email-already-in-use" };
      list.push({ ...a, hash: await sha(pass) });
      if (!wr(AK, list)) throw { message: "penyimpanan penuh" };
    }
    finish(a);
  } catch (x) { er.textContent = fbErr(x); busy(b, false, "Daftar"); }
});

$("fLog").addEventListener("submit", async e => {
  e.preventDefault();
  const id = $("lId").value.trim().toLowerCase(), pass = $("lPass").value, b = $("bLog"), er = $("eLog");
  er.textContent = "";
  if (!id || !pass) return er.textContent = "Isi Gmail/nomor WhatsApp dan kata sandi.";
  busy(b, true);
  try {
    let acc;
    if (window.JK && JK.register) {
      const p = await JK.login(id, pass);
      acc = { ...p, email: p.email || id };
    } else {
      const h = await sha(pass), key = id.includes("@") ? id : nw(id);
      acc = rd(AK, []).find(x => (x.email === key || x.wa === key) && x.hash === h);
      if (!acc) throw { code: "auth/invalid-credential" };
    }
    finish(acc);
  } catch (x) { er.textContent = fbErr(x); busy(b, false, "Masuk"); }
});
})();
