# WARUNGKU

Aplikasi warung online (pelanggan + penjual) dengan **Pusat Kendali** untuk memverifikasi akun dan memantau keamanan. Berjalan di GitHub Pages, data di Firebase (Realtime Database + Authentication).

## Isi repo

| File | Fungsi |
|---|---|
| `index.html` | Halaman pelanggan |
| `admin.html` | Halaman penjual |
| `pusat.html` | **Pusat Kendali** (verifikasi, keamanan, perangkat) |
| `warungku-auth.js` | Daftar/masuk, verifikasi wajah, kunci halaman |
| `firebase-sync.js` | Sinkron data, cek status akun, laporan keamanan |
| `warungku-guard.js` | Sensor keamanan + info perangkat/lokasi (dengan izin) |
| `warungku.css` | Gaya bersama |
| `database.rules.json` | Aturan Firebase (salin ke tab Rules) |

## Cara kerja akun

1. Pendaftar (pelanggan atau penjual) berstatus **menunggu**. Belum bisa masuk.
2. Pusat menyetujui, menolak (dengan alasan), atau menangguhkan di menu **Verifikasi**.
3. Akun yang ditangguhkan saat sedang dipakai langsung dikeluarkan. Akun yang dihapus tidak bisa masuk lagi.
4. Akun lama tanpa status dianggap disetujui. Tombol **Setujui semua** di pusat menandainya.

**Verifikasi wajah (pelanggan dan penjual):** suara memandu tengok kanan, kiri, lalu diam. Foto diambil otomatis; jika buram diulang. Foto pelanggan jadi foto profil; foto penjual tidak (sudah ada logo warung). Keduanya dikirim ke pusat. Foto besar dihapus dari database saat akun disetujui atau ditolak. Tidak ada unggah KTP dan tidak ada pencocokan identitas otomatis.

**Banyak perangkat:** satu akun penjual bisa masuk dari beberapa HP sekaligus. Data toko diambil dari server, dan pusat menampilkan semua perangkat milik akun itu.

## Pemasangan

### 1. Firebase
1. Aktifkan **Authentication** (Email/Password dan Anonymous) dan **Realtime Database**.
2. Tab **Rules**: tempel isi `database.rules.json` (lihat di bawah), lalu **Publish**.
3. **Authentication → Settings → Authorized domains**: tambahkan `USERNAME.github.io`.

### 2. Akun pusat
1. **Authentication → Users → Add user**, lalu salin **User UID**.
2. **Realtime Database → Data**: tambah node `pusat/UID_ANDA` bernilai `true` (Boolean, tanpa kutip).
3. Di HP, aktifkan *Desktop site* jika ikon **+** tidak terlihat.

### 3. GitHub Pages
1. Unggah semua file di atas ke repo (satu folder).
2. **Settings → Pages → Deploy from a branch → `main` / root**.
3. Buka `https://USERNAME.github.io/NAMA-REPO/pusat.html` dan masuk dengan akun pusat. Jangan pasang tautan pusat di halaman publik.

## Beberapa perangkat dan lupa kata sandi

- **Penjual di banyak perangkat:** daftarkan tiap perangkat/staf dengan Gmail sendiri (`@gmail.com`) lewat `admin.html`, lalu setujui di pusat. Akun penjual yang **disetujui** boleh mengelola produk, pesanan, dan chat dari perangkat mana pun. Akun penjual lama perlu ditandai disetujui dulu (tombol **Setujui semua** di pusat).
- **Verifikasi wajah** berlaku untuk penjual maupun pelanggan, dan fotonya otomatis terkirim ke pusat.
- **Lupa kata sandi:** di halaman masuk (admin dan pelanggan) ketuk *Lupa kata sandi?*, isi Gmail atau nomor WhatsApp. Tautan atur ulang dikirim ke Gmail akun. Tampilan email bisa diubah di Firebase → Authentication → Templates.

## Menu Pusat Kendali

- **Verifikasi**: antrean pendaftar, pencarian, filter peran, foto wajah, tombol Hapus untuk akun ditangguhkan.
- **Keamanan**: peta lokasi toko (kubus 3D) dan pelanggan (bola 3D) terdaftar dengan lingkaran akurasi GPS, status Aman/Waspada/Terancam, *Live Topography* (peta dunia, filter ALL/1H/24H/7D), pindai database, analisis dan perbaikan otomatis, ekspor CSV.
- **Perangkat**: model HP, OS, peramban, jenis jaringan, IP, dan lokasi (hanya dari pengguna yang mengizinkan).
- **Lonceng** (kanan atas): pendaftar menunggu dan ancaman terbuka.

## Keamanan otomatis

`warungku-guard.js` memblokir skrip/iframe/form asing, mendeteksi clickjacking, dan mengunci login 60 detik setelah 5 kali gagal. Semua kejadian dilaporkan ke pusat. Perbaikan otomatis hanya melakukan: membersihkan teks berbahaya, menangguhkan akun pengirim (jika 2 konten berbahaya atau lebih), dan menutup catatan.

**AI:** secara bawaan memakai mesin aturan lokal. Untuk AI sungguhan, isi `PUSAT_AI.endpoint` di `pusat.html` dengan proxy Anda sendiri (misalnya Cloud Function). **Jangan menaruh kunci API di file publik.**

## Privasi dan batasan

- Lokasi, info perangkat, dan jaringan hanya terkirim setelah pengguna menekan **Izinkan**. Peramban tidak bisa membaca nama Wi-Fi atau operator.
- Akurasi lokasi mengikuti GPS dan izin di HP.
- Menghapus akun di pusat tidak menghapus akun di Firebase Authentication; hapus manual di Console jika perlu.
- Tidak ada deteksi virus berkas atau proteksi DDoS. Itu perlu sisi server.
- Perlindungan sebenarnya ada di **aturan database**, bukan di tampilan. Jangan longgarkan aturan tanpa paham dampaknya.

## Aturan database

```json
{
  "rules": {
    "pusat": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": false
      }
    },
    "products": {
      ".read": true,
      ".write": "auth != null && ((auth.token.email == 'jangcodingai@gmail.com' || (root.child('users/' + auth.uid + '/role').val() === 'admin' && root.child('users/' + auth.uid + '/status').val() === 'approved')) || root.child('pusat/' + auth.uid).val() === true)"
    },
    "settings": {
      ".read": true,
      ".write": "auth != null && ((auth.token.email == 'jangcodingai@gmail.com' || (root.child('users/' + auth.uid + '/role').val() === 'admin' && root.child('users/' + auth.uid + '/status').val() === 'approved')) || root.child('pusat/' + auth.uid).val() === true)"
    },
    "orders": {
      ".indexOn": [
        "uid"
      ],
      ".read": "auth != null && ((auth.token.email == 'jangcodingai@gmail.com' || (root.child('users/' + auth.uid + '/role').val() === 'admin' && root.child('users/' + auth.uid + '/status').val() === 'approved')) || root.child('pusat/' + auth.uid).val() === true || (query.orderByChild == 'uid' && query.equalTo == auth.uid))",
      "$id": {
        ".write": "auth != null && ((auth.token.email == 'jangcodingai@gmail.com' || (root.child('users/' + auth.uid + '/role').val() === 'admin' && root.child('users/' + auth.uid + '/status').val() === 'approved')) || root.child('pusat/' + auth.uid).val() === true || (!data.exists() && newData.child('uid').val() === auth.uid))",
        ".validate": "newData.hasChildren(['id','name','total','items','status','date'])"
      }
    },
    "chats": {
      ".read": "auth != null && ((auth.token.email == 'jangcodingai@gmail.com' || (root.child('users/' + auth.uid + '/role').val() === 'admin' && root.child('users/' + auth.uid + '/status').val() === 'approved')) || root.child('pusat/' + auth.uid).val() === true)",
      "$cid": {
        ".read": "auth != null && $cid === auth.uid",
        ".write": "auth != null && ($cid === auth.uid || (auth.token.email == 'jangcodingai@gmail.com' || (root.child('users/' + auth.uid + '/role').val() === 'admin' && root.child('users/' + auth.uid + '/status').val() === 'approved')) || root.child('pusat/' + auth.uid).val() === true)"
      }
    },
    "reviews": {
      ".read": true,
      "$rid": {
        ".write": "auth != null && ((!data.exists() && newData.child('uid').val() === auth.uid) || (auth.token.email == 'jangcodingai@gmail.com' || (root.child('users/' + auth.uid + '/role').val() === 'admin' && root.child('users/' + auth.uid + '/status').val() === 'approved')) || root.child('pusat/' + auth.uid).val() === true)",
        ".validate": "newData.child('rating').isNumber() && newData.child('rating').val() >= 1 && newData.child('rating').val() <= 5"
      }
    },
    "users": {
      ".read": "auth != null && root.child('pusat/' + auth.uid).val() === true",
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && (root.child('pusat/' + auth.uid).val() === true || (auth.uid == $uid && !data.exists() && newData.child('status').val() === 'pending'))",
        "status": {
          ".validate": "newData.val() === 'pending' || newData.val() === 'approved' || newData.val() === 'rejected' || newData.val() === 'suspended'"
        },
        "photo": {
          ".validate": "newData.isString() && newData.val().length < 20000 && newData.val().beginsWith('data:image/')"
        }
      }
    },
    "kyc": {
      "$uid": {
        ".read": "auth != null && root.child('pusat/' + auth.uid).val() === true",
        ".write": "auth != null && (root.child('pusat/' + auth.uid).val() === true || (auth.uid === $uid && !data.exists()))",
        ".validate": "newData.child('selfie').isString() && newData.child('selfie').val().length < 150000"
      }
    },
    "devices": {
      ".read": "auth != null && root.child('pusat/' + auth.uid).val() === true",
      "$uid": {
        ".write": "auth != null && (auth.uid === $uid || root.child('pusat/' + auth.uid).val() === true)"
      }
    },
    "phones": {
      "$wa": {
        ".read": true,
        ".write": "auth != null && (!data.exists() || root.child('pusat/' + auth.uid).val() === true)",
        ".validate": "newData.isString()"
      }
    },
    "security": {
      "events": {
        ".read": "auth != null && root.child('pusat/' + auth.uid).val() === true",
        "$id": {
          ".write": "auth != null && (root.child('pusat/' + auth.uid).val() === true || !data.exists())",
          ".validate": "newData.hasChildren(['t','type','msg'])"
        }
      }
    }
  }
}
```

Hak penjual di aturan ini hanya untuk email `jangcodingai@gmail.com`. Ubah jika perlu lebih dari satu penjual.

## Masalah umum

| Gejala | Solusi |
|---|---|
| Pusat: "Akun ini tidak punya akses pusat" | Cek node `pusat/UID` bernilai Boolean `true` |
| Login gagal di GitHub Pages | Tambahkan domain di *Authorized domains* |
| Pendaftar baru tidak muncul | Pastikan rules sudah dipublish dan semua file terbaru terunggah |
| Menu Perangkat kosong | Pengguna belum menekan Izinkan di banner |
| Perubahan tidak tampil | Tunggu 1–2 menit dan muat ulang tanpa cache |
