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
  + pw("rPass", "Kata sandi", "new-password")
  + (ADM ? "" : `<div class="wk-face" id="faceRow"><span class="wk-fi" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 10v1M15 10v1M9.5 15c1.5 1.3 3.5 1.3 5 0"/></svg></span><span class="wk-ft"><b>Verifikasi wajah</b><small id="faceTxt">Pastikan kamu pengguna asli. Foto tidak disimpan.</small></span><button type="button" class="wk-fb" id="faceBtn">Mulai</button></div>`);

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


/* ---------- Verifikasi wajah (khusus pendaftaran pelanggan) ----------
   Kamera depan + deteksi wajah di perangkat (face-api). Pengguna menengok ke kiri dan kanan
   sebagai bukti kehadiran langsung. Tidak ada gambar yang diunggah atau disimpan. */
const FACE = Object.assign({
  required: true,
  lib: "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.js",
  models: ["https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/", "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/"],
  turn: 1.8, timeout: 45000
}, window.WK_FACE || {});
let faceOK = false, faceSkipped = false;
if (!ADM) {
  const ov = document.createElement("div");
  ov.id = "wk-face"; ov.hidden = true; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Verifikasi wajah");
  ov.innerHTML = `<button type="button" class="wk-fx" id="faceX" aria-label="Tutup">&times;</button>
    <div class="wk-fv" id="faceBox"><video id="faceVid" playsinline muted autoplay></video></div>
    <h3 id="faceH">Siapkan wajahmu</h3><p id="faceP">Memulai kamera…</p>
    <div class="wk-steps" aria-hidden="true"><i id="fs1"></i><i id="fs2"></i><i id="fs3"></i></div>
    <button type="button" class="wk-btn" id="faceRetry" hidden>Coba lagi</button>
    <button type="button" class="wk-lnk" id="faceSkip" hidden>Lanjut tanpa verifikasi</button>`;
  document.body.appendChild(ov);

  let fapi = null, stream = null, run = 0;
  const setMsg = (h, p) => { $("faceH").textContent = h; $("faceP").textContent = p; };
  const mark = n => [1, 2, 3].forEach(k => $("fs" + k).classList.toggle("on", k <= n));
  const loadScript = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.async = true; s.onload = ok; s.onerror = () => no(new Error("lib")); document.head.appendChild(s); });
  async function engine() {
    if (fapi) return fapi;
    if (!window.faceapi) await loadScript(FACE.lib);
    const f = window.faceapi; if (!f) throw new Error("lib");
    let ok = false;
    for (const base of FACE.models) {
      try { await f.nets.tinyFaceDetector.loadFromUri(base); await f.nets.faceLandmark68TinyNet.loadFromUri(base); ok = true; break; } catch (e) {}
    }
    if (!ok) throw new Error("model");
    return fapi = f;
  }
  function stopCam() { run++; if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } const v = $("faceVid"); v.srcObject = null; }
  function closeFace() { stopCam(); ov.hidden = true; document.documentElement.classList.remove("wk-facing"); }
  function showFail(h, p, skip) {
    stopCam(); setMsg(h, p); $("faceBox").className = "wk-fv bad";
    $("faceRetry").hidden = false; $("faceSkip").hidden = !skip;
  }
  const camErr = e => {
    const n = e && e.name || "";
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return "Kamera butuh koneksi aman (HTTPS) dan peramban terbaru.";
    if (n === "NotAllowedError" || n === "SecurityError") return "Izin kamera ditolak. Aktifkan izin kamera untuk situs ini di pengaturan peramban, lalu coba lagi.";
    if (n === "NotFoundError" || n === "OverconstrainedError") return "Kamera tidak ditemukan di perangkat ini.";
    if (n === "NotReadableError") return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.";
    return "Kamera tidak bisa dibuka. Coba lagi.";
  };
  async function startFace() {
    const my = ++run;
    ov.hidden = false; document.documentElement.classList.add("wk-facing");
    $("faceRetry").hidden = true; $("faceSkip").hidden = true; $("faceBox").className = "wk-fv"; mark(0);
    setMsg("Siapkan wajahmu", "Memulai kamera…");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw { name: "NoMedia" };
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch (e) { return my === run && showFail("Kamera belum bisa dipakai", camErr(e), false); }
    if (my !== run) { stopCam(); return; }
    const vid = $("faceVid"); vid.srcObject = stream;
    try { await vid.play(); } catch (e) {}
    setMsg("Menyiapkan pendeteksi", "Memuat pendeteksi wajah, tunggu sebentar…");
    let f;
    try { f = await engine(); }
    catch (e) { return my === run && showFail("Pendeteksi wajah gagal dimuat", "Periksa koneksi internet lalu coba lagi.", true); }
    if (my !== run) return;
    const opts = new f.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    const t0 = Date.now(); let step = 0, front = 0, seenA = 0, seenB = 0, lastFace = Date.now(), hitA = 0, hitB = 0;
    $("faceBox").className = "wk-fv scan";
    setMsg("Hadapkan wajah ke kamera", "Posisikan wajahmu di dalam bingkai dengan cahaya cukup.");
    while (my === run) {
      if (Date.now() - t0 > FACE.timeout) return showFail("Waktu habis", "Verifikasi belum selesai. Coba lagi dengan cahaya yang lebih terang.", false);
      let r = null;
      try { r = await f.detectSingleFace(vid, opts).withFaceLandmarks(true); } catch (e) { r = null; }
      if (my !== run) return;
      if (r && r.landmarks) {
        lastFace = Date.now();
        const p = r.landmarks.positions, nose = p[30], j0 = p[0], j16 = p[16];
        const vw = vid.videoWidth || 640, bw = r.detection.box.width / vw;
        const ratio = (nose.x - j0.x) / Math.max(1e-3, (j16.x - nose.x));
        if (bw < 0.22) setMsg("Dekatkan wajahmu", "Wajah terlalu jauh dari kamera.");
        else if (step === 0) {
          if (ratio > 0.7 && ratio < 1.45) { if (++front >= 4) { step = 1; mark(1); setMsg("Tengok pelan ke satu sisi", "Putar kepalamu ke kiri atau kanan, lalu ke sisi sebaliknya."); } }
          else front = 0;
        } else {
          if (ratio > FACE.turn) { hitA++; hitB = 0; } else if (ratio < 1 / FACE.turn) { hitB++; hitA = 0; } else { hitA = hitB = 0; }
          if (hitA >= 2 && !seenA) { seenA = 1; hitA = 0; }
          if (hitB >= 2 && !seenB) { seenB = 1; hitB = 0; }
          const n = seenA + seenB; mark(1 + n);
          if (n === 1) setMsg("Bagus!", "Sekarang tengok ke sisi sebaliknya.");
          if (n === 2) {
            $("faceBox").className = "wk-fv ok"; setMsg("Wajah terverifikasi", "Terima kasih. Melanjutkan pendaftaran…");
            await new Promise(res => setTimeout(res, 650));
            if (my !== run) return;
            faceOK = true; faceSkipped = false; closeFace(); paintFace(); return;
          }
        }
      } else if (Date.now() - lastFace > 6000) {
        setMsg("Wajah belum terlihat", "Dekatkan wajah ke kamera, hadap lurus, dan pastikan cukup cahaya.");
      }
      await new Promise(res => setTimeout(res, 110));
    }
  }
  function paintFace() {
    const row = $("faceRow"), ok = faceOK || faceSkipped;
    row.classList.toggle("ok", faceOK); row.classList.toggle("skip", faceSkipped);
    if (ok && $("eReg")) $("eReg").textContent = "";
    $("faceTxt").textContent = faceOK ? "Wajah terverifikasi" : faceSkipped ? "Dilewati (pendeteksi tidak tersedia)" : "Pastikan kamu pengguna asli. Foto tidak disimpan.";
    $("faceBtn").textContent = ok ? "Ulangi" : "Mulai";
  }
  $("faceBtn").addEventListener("click", startFace);
  $("faceRetry").addEventListener("click", startFace);
  $("faceX").addEventListener("click", closeFace);
  $("faceSkip").addEventListener("click", () => { faceSkipped = true; faceOK = false; closeFace(); paintFace(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !ov.hidden) closeFace(); });
}

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
  if (!ADM && FACE.required && !faceOK && !faceSkipped) {
    er.textContent = "Verifikasi wajah dulu ya. Ketuk tombol Mulai.";
    const row = $("faceRow"); row.classList.add("need"); row.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(() => row.classList.remove("need"), 1200); return;
  }
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
    if (!ADM) wr("wk_face_ok", { ok: faceOK, skipped: faceSkipped, t: Date.now() });
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
