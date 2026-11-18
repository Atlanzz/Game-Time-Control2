/* =========================================================
   RENDER
   ========================================================= */
function pageHeader(title, description) {
  return `<div class="page-header"><h1>${esc(title)}</h1>${
    description ? `<p>${esc(description)}</p>` : ""
  }</div>`;
}

function statCard(label, value, icon, bg, small = false, unit = "") {
  return `
    <div class="card">
      <div class="stat-card">
        <div style="min-width:0">
          <p class="label">${label}</p>
          <p class="value ${small ? "sm truncate" : ""}">${esc(value)}</p>
          ${unit ? `<p class="small">${unit}</p>` : ""}
        </div>
        <div class="stat-icon ${bg}">${icon}</div>
      </div>
    </div>`;
}

/* ---------- Login ---------- */
function renderLogin() {
  let body = "";

  if (state.loginMode === "login") {
    body = `
      <div class="field">
        <label class="lbl">Username</label>
        <input id="login-username" class="input" placeholder="Masukkan username" autocomplete="username" />
      </div>
      <div class="field">
        <label class="lbl">Password</label>
        <input id="login-password" type="password" class="input" placeholder="Masukkan password" autocomplete="current-password" />
      </div>
      <button class="btn btn-primary btn-full" data-action="login">Login</button>

      <div class="login-links">
        <button class="btn-link" data-action="mode" data-value="forgot">Lupa password?</button>
        <button class="btn-link" data-action="mode" data-value="register">Belum punya akun? Registrasi</button>
      </div>`;
  }

  if (state.loginMode === "register") {
    body = `
      <div style="margin-bottom:24px">
        <h2 style="font-size:20px">Buat Akun Baru</h2>
        <p class="muted" style="font-size:14px;margin-top:4px">Isi data berikut untuk membuat akun.</p>
      </div>
      <div class="field"><label class="lbl">Nama Lengkap</label><input id="reg-name" class="input" placeholder="Nama lengkap" /></div>
      <div class="field"><label class="lbl">Username</label><input id="reg-username" class="input" placeholder="Username" /></div>
      <div class="field"><label class="lbl">Email</label><input id="reg-email" type="email" class="input" placeholder="Email" /></div>
      <div class="field"><label class="lbl">Password</label><input id="reg-password" type="password" class="input" placeholder="Password minimal 6 karakter" /></div>
      <div class="field">
        <label class="lbl">Konfirmasi Password</label>
        <input id="reg-confirm" type="password" class="input" placeholder="Ulangi password" />
        <p id="reg-hint" class="hint"></p>
      </div>
      <button class="btn btn-primary btn-full" data-action="register">Buat Akun</button>
      <button class="btn-ghost btn-full" style="margin-top:20px" data-action="mode" data-value="login">← Kembali ke Login</button>`;
  }

  if (state.loginMode === "forgot") {
    body = `
      <div style="margin-bottom:20px">
        <h2 style="font-size:20px">Lupa Password</h2>
        <p class="muted" style="font-size:14px;margin-top:8px">Masukkan email yang digunakan saat registrasi.</p>
      </div>
      <div class="field"><input id="forgot-email" type="email" class="input" placeholder="Email" /></div>
      <button class="btn btn-primary btn-full" data-action="forgot">Reset Password</button>
      <button class="btn-ghost btn-full" style="margin-top:20px" data-action="mode" data-value="login">← Kembali ke Login</button>`;
  }

  return `
    <div class="login-wrap">
      <div class="blob a"></div>
      <div class="blob b"></div>
      <div class="login-box">
        <div class="login-head">
          <div class="logo">🎮</div>
          <h1>Game Time Control</h1>
          <p>Kelola dan pantau waktu bermain game</p>
        </div>
        ${body}
      </div>
    </div>`;
}

/* ---------- Halaman ---------- */
function pageDashboard() {
  const user = state.currentUser;
  const admin = isAdmin();

  let html = pageHeader(
    `Selamat datang, ${user.name}!`,
    admin
      ? "Pantau aktivitas dan pengelolaan Game Time Control."
      : "Kelola waktu bermain game kamu dengan lebih teratur.",
  );

  html += `<div class="grid g4 mb-7">
    ${statCard("Total Permainan", state.games.length, "🎮", "bg-blue")}
    ${statCard("Total Sesi", state.history.length, "▶", "bg-green")}
    ${statCard("Waktu Bermain", totalPlayedMinutes(), "⏱", "bg-purple", false, "menit")}
    ${statCard("Paling Sering Dimainkan", mostPlayedGame(), "🏆", "bg-yellow", true)}
  </div>`;

  if (!admin) {
    html += `
      <div class="row-between mb-5">
        <h2 style="font-size:20px">Mulai Bermain</h2>
        <button class="btn-link" data-action="nav" data-value="games">Lihat semua →</button>
      </div>
      <div class="grid g4">
        ${state.games
          .slice(0, 4)
          .map(
            (g) => `
          <div class="game-card">
            <div class="game-img sm">${imgTag(g.image, g.name)}</div>
            <div style="padding:16px">
              <p style="font-weight:700">${esc(g.name)}</p>
              <p class="small" style="margin-top:4px">${esc(g.genre)}</p>
              <button class="btn btn-primary btn-full" style="margin-top:16px;padding:10px" data-action="start-game" data-value="${esc(g.name)}">▶ Mulai</button>
            </div>
          </div>`,
          )
          .join("")}
      </div>`;
  } else {
    const recent = state.history.slice(-5).reverse();
    html += `
      <div class="grid g2">
        <div class="card">
          <h2 class="section-title">Aksi Cepat</h2>
          <div class="grid g2" style="gap:16px">
            <button class="quick btn-primary" data-action="open-game-modal"><div>＋</div><div>Tambah Game</div></button>
            <button class="quick btn-soft" data-action="nav" data-value="users"><div>👥</div><div>Kelola Pemain</div></button>
            <button class="quick btn-soft" data-action="nav" data-value="monitoring"><div>◉</div><div>Monitoring</div></button>
            <button class="quick btn-soft" data-action="nav" data-value="settings"><div>⚙</div><div>Pengaturan</div></button>
          </div>
        </div>
        <div class="card">
          <h2 class="section-title">Aktivitas Terbaru</h2>
          ${
            recent.length === 0
              ? `<div class="empty">Belum ada aktivitas.</div>`
              : recent
                  .map(
                    (i) => `
            <div class="list-item">
              <div><p style="font-weight:600">${esc(i.gameName)}</p><p class="small">${esc(i.date)}${i.username ? " · @" + esc(i.username) : ""}</p></div>
              <div style="text-align:right"><p style="font-size:14px">${i.duration} menit</p><p class="small">${esc(i.status)}</p></div>
            </div>`,
                  )
                  .join("")
          }
        </div>
      </div>`;
  }
  return html;
}

function gamesGridHtml() {
  const keyword = state.search.toLowerCase().trim();
  const list = keyword
    ? state.games.filter(
        (g) =>
          g.name.toLowerCase().includes(keyword) ||
          g.genre.toLowerCase().includes(keyword),
      )
    : state.games;
  const admin = isAdmin();

  if (list.length === 0) {
    return `<div class="card empty">Game tidak ditemukan.</div>`;
  }

  return `<div class="grid g3" style="gap:24px">${list
    .map(
      (g) => `
    <div class="game-card">
      <div class="game-img">${imgTag(g.image, g.name)}<div class="genre-tag">${esc(g.genre)}</div></div>
      <div class="game-body">
        <h3>${esc(g.name)}</h3>
        <p class="desc">${esc(g.description)}</p>
        ${
          admin
            ? `<div class="game-actions">
                <button class="btn btn-soft" data-action="open-game-modal" data-id="${g.id}">✎ Edit</button>
                <button class="btn btn-danger" data-action="delete-game" data-id="${g.id}">🗑 Hapus</button>
              </div>`
            : `<button class="btn btn-primary btn-full" style="margin-top:20px" data-action="start-game" data-value="${esc(g.name)}">▶ Mulai Bermain</button>`
        }
      </div>
    </div>`,
    )
    .join("")}</div>`;
}

function pageGames() {
  return `
    ${pageHeader("Permainan", "Daftar permainan yang tersedia di Game Time Control.")}
    <div class="toolbar">
      <div class="search">
        <span>🔍</span>
        <input id="search-input" class="input" placeholder="Cari permainan..." value="${esc(state.search)}" />
      </div>
      ${isAdmin() ? `<button class="btn btn-primary" data-action="open-game-modal">＋ Tambah Game</button>` : ""}
    </div>
    <div id="games-grid">${gamesGridHtml()}</div>`;
}

function pageLimit() {
  return `
    ${pageHeader("Atur Batas Waktu", "Tentukan berapa lama kamu ingin bermain.")}
    <div style="max-width:768px">
      <div class="card" style="padding:28px">
        <div style="text-align:center;margin-bottom:32px">
          <p class="muted">Batas waktu saat ini</p>
          <p id="limit-display" class="limit-big">${formatMinutes(state.gameLimit)}</p>
        </div>
        <input id="limit-range" type="range" min="10" max="240" step="10" value="${state.gameLimit}" />
        <div class="row-between small" style="margin-top:8px"><span>10 menit</span><span>4 jam</span></div>

        <div class="grid g4" style="gap:12px;margin-top:32px">
          ${[30, 60, 90, 120]
            .map(
              (m) =>
                `<button class="opt-btn ${state.gameLimit === m ? "active" : ""}" data-action="set-limit" data-value="${m}">${formatMinutes(m)}</button>`,
            )
            .join("")}
        </div>

        <div class="tip">💡 Setelah batas waktu tercapai, timer akan berhenti otomatis dan sistem akan memberikan peringatan.</div>
        <button class="btn btn-primary btn-full" style="margin-top:24px" data-action="nav" data-value="games">Pilih Game →</button>
      </div>
    </div>`;
}

function pageTimer() {
  const total = state.gameLimit * 60;
  const progress = total > 0 ? Math.max(0, Math.min(100, (state.timerSeconds / total) * 100)) : 0;

  let inner;
  if (state.selectedGame) {
    inner = `
      <div class="chip">🎮 ${esc(state.selectedGame)}</div>
      <h2 id="timer-display" class="big-time">${formatTime(state.timerSeconds)}</h2>
      <p class="muted" style="margin-top:16px">Batas waktu: ${formatMinutes(state.gameLimit)}</p>
      <div class="progress"><div id="timer-bar" style="width:${progress}%"></div></div>

      ${
        state.timerFinished
          ? `<div class="alert-box"><strong>⚠ Batas Waktu Tercapai</strong><p class="muted" style="font-size:14px;margin-top:8px">Waktu bermain untuk game ini telah habis.</p></div>`
          : ""
      }

      <div class="btn-row">
        ${
          state.timerRunning
            ? `<button class="btn btn-warning" data-action="pause-timer">❚❚ Jeda</button>`
            : `<button class="btn btn-primary" data-action="start-timer" ${state.timerFinished ? "disabled" : ""}>▶ Mulai</button>`
        }
        <button class="btn btn-danger" data-action="stop-timer">■ Stop</button>
        <button class="btn btn-soft" data-action="reset-timer">↻ Reset</button>
        <button class="btn btn-soft" data-action="nav" data-value="games">🎮 Game</button>
      </div>`;
  } else {
    inner = `
      <div style="padding:48px 0">
        <div style="font-size:64px;margin-bottom:20px">🎮</div>
        <h2 style="font-size:24px">Belum ada game dipilih</h2>
        <p class="muted" style="margin-top:8px">Pilih permainan terlebih dahulu untuk memulai timer.</p>
        <button class="btn btn-primary" style="margin-top:24px" data-action="nav" data-value="games">Pilih Game</button>
      </div>`;
  }

  return `
    ${pageHeader("Timer Bermain", "Pantau waktu bermain kamu secara real-time.")}
    <div style="max-width:768px;margin:0 auto"><div class="card center-card">${inner}</div></div>`;
}

function statusBadge(status) {
  const cls =
    status === "Batas tercapai" ? "badge-red" : status === "Selesai" ? "badge-green" : "badge-blue";
  return `<span class="badge ${cls}">${esc(status)}</span>`;
}

function pageHistory() {
  const rows = [...state.history].reverse();
  return `
    ${pageHeader(isAdmin() ? "Laporan" : "History", "Riwayat sesi bermain.")}
    <div class="table-wrap">
      ${
        rows.length === 0
          ? `<div class="empty">Belum ada riwayat permainan.</div>`
          : `<div class="table-scroll"><table>
        <thead><tr><th>Game</th>${isAdmin() ? "<th>Pemain</th>" : ""}<th>Tanggal</th><th>Durasi</th><th>Status</th></tr></thead>
        <tbody>${rows
          .map(
            (i) => `<tr>
          <td style="font-weight:600">${esc(i.gameName)}</td>
          ${isAdmin() ? `<td class="muted">@${esc(i.username || "-")}</td>` : ""}
          <td class="muted">${esc(i.date)}</td>
          <td>${i.duration} menit</td>
          <td>${statusBadge(i.status)}</td>
        </tr>`,
          )
          .join("")}</tbody></table></div>`
      }
    </div>`;
}

function pageStatistics() {
  const totals = {};
  state.history.forEach((i) => {
    totals[i.gameName] = (totals[i.gameName] || 0) + i.duration;
  });
  const stats = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = stats.length ? stats[0][1] : 0;

  return `
    ${pageHeader(isAdmin() ? "Pencapaian & Statistik" : "Statistik", "Ringkasan aktivitas permainan berdasarkan data sesi.")}
    <div class="grid g3 mb-7">
      <div class="card"><p class="muted">Total Waktu</p><p style="font-size:30px;font-weight:700;margin-top:8px">${formatMinutes(totalPlayedMinutes())}</p></div>
      <div class="card"><p class="muted">Total Sesi</p><p style="font-size:30px;font-weight:700;margin-top:8px">${state.history.length}</p></div>
      <div class="card"><p class="muted">Game Teratas</p><p style="font-size:24px;font-weight:700;margin-top:8px">${esc(mostPlayedGame())}</p></div>
    </div>
    <div class="card">
      <h2 class="section-title">Waktu Bermain per Game</h2>
      ${
        stats.length === 0
          ? `<div class="empty">Belum ada data statistik.</div>`
          : stats
              .map(
                ([name, minutes]) => `
        <div class="bar-row">
          <div class="top"><span style="font-weight:500">${esc(name)}</span><span class="muted">${minutes} menit</span></div>
          <div class="bar"><div style="width:${max > 0 ? (minutes / max) * 100 : 0}%"></div></div>
        </div>`,
              )
              .join("")
      }
    </div>`;
}

function pageBreak() {
  let inner;
  if (state.breakRunning) {
    inner = `
      <h2 style="font-size:24px">Saatnya Istirahat</h2>
      <div id="break-display" style="font-size:64px;font-weight:700;margin-top:32px">${formatTime(state.breakSeconds)}</div>
      <button class="btn btn-danger" style="margin-top:32px;padding:12px 32px" data-action="stop-break">Hentikan Istirahat</button>`;
  } else {
    inner = `
      <h2 style="font-size:24px">Ambil Waktu Istirahat</h2>
      <p class="muted" style="margin-top:8px">Pilih durasi istirahat.</p>
      <div class="grid g3" style="gap:12px;margin-top:28px">
        ${[5, 10, 15]
          .map(
            (m) =>
              `<button class="opt-btn ${state.breakMinutes === m ? "active" : ""}" data-action="set-break" data-value="${m}">${m} menit</button>`,
          )
          .join("")}
      </div>
      <button class="btn btn-primary btn-full" style="margin-top:24px" data-action="start-break">▶ Mulai Istirahat</button>`;
  }

  return `
    ${pageHeader("Mode Istirahat", "Gunakan waktu istirahat setelah bermain.")}
    <div style="max-width:576px;margin:0 auto">
      <div class="card center-card" style="padding:32px"><div style="font-size:64px;margin-bottom:20px">☕</div>${inner}</div>
    </div>`;
}

function pageUsers() {
  return `
    ${pageHeader("Pemain", "Kelola akun pengguna Game Time Control.")}
    <div class="table-wrap"><div class="table-scroll"><table>
      <thead><tr><th>Pengguna</th><th>Email</th><th>Role</th><th>Aksi</th></tr></thead>
      <tbody>${state.users
        .map(
          (u) => `<tr>
        <td><div style="display:flex;align-items:center;gap:12px">
          ${avatarHtml(u.photo, u.name)}
          <div><p style="font-weight:600">${esc(u.name)}</p><p class="small">@${esc(u.username)}</p></div>
        </div></td>
        <td class="muted">${esc(u.email)}</td>
        <td><span class="badge badge-blue cap">${esc(u.role)}</span></td>
        <td>${
          u.id !== state.currentUser.id
            ? `<button class="btn-link" style="color:var(--danger)" data-action="delete-user" data-id="${u.id}">🗑 Hapus</button>`
            : ""
        }</td>
      </tr>`,
        )
        .join("")}</tbody>
    </table></div></div>`;
}

function pageMonitoring() {
  const active = state.history.filter((i) => i.status === "Sedang bermain");
  const rows = [...state.history].reverse();

  return `
    ${pageHeader("Monitoring Sesi", "Pantau sesi permainan yang sedang berlangsung.")}
    <div class="grid g3 mb-7">
      <div class="card"><p class="muted">Sesi Aktif</p><p style="font-size:36px;font-weight:700;margin-top:8px">${active.length}</p></div>
      <div class="card"><p class="muted">Total Sesi</p><p style="font-size:36px;font-weight:700;margin-top:8px">${state.history.length}</p></div>
      <div class="card"><p class="muted">Total Waktu</p><p style="font-size:24px;font-weight:700;margin-top:8px">${formatMinutes(totalPlayedMinutes())}</p></div>
    </div>
    <div class="card">
      <h2 class="section-title">Sesi Permainan</h2>
      ${
        rows.length === 0
          ? `<div class="empty">Belum ada sesi.</div>`
          : rows
              .map(
                (i) => `
        <div class="list-item">
          <div><p style="font-weight:600">${esc(i.gameName)}</p><p class="small">${esc(i.date)}${i.username ? " · @" + esc(i.username) : ""}</p></div>
          <div style="display:flex;align-items:center;gap:20px">
            <span style="font-size:14px">${i.duration} menit</span>
            ${statusBadge(i.status)}
          </div>
        </div>`,
              )
              .join("")
      }
    </div>`;
}

function pageSettings() {
  return `
    ${pageHeader("Pengaturan", "Pengaturan sistem Game Time Control.")}
    <div style="max-width:768px;display:grid;gap:20px">
    <div class="card">
  <h2 style="font-size:18px">Tampilan</h2>
  <p class="muted" style="font-size:14px;margin-top:8px">
    Pilih tema tampilan aplikasi.
  </p>
    <div style="display:flex;gap:10px;margin-top:16px">
    <button class="btn btn-soft" data-action="set-theme" data-value="light">
      Light Mode
      </button>
      <button class="btn btn-soft" data-action="set-theme" data-value="dark">
      Dark Mode
      </button>
    </div>
  </div>
      <div class="card">
        <h2 style="font-size:18px">Informasi Sistem</h2>
        <div class="info-row" style="margin-top:20px"><span>Nama Sistem</span><span>Game Time Control</span></div>
        <div class="info-row"><span>Versi</span><span>1.0.0</span></div>
        <div class="info-row"><span>Role</span><span class="cap">${esc(state.currentUser.role)}</span></div>
      </div>
      <div class="card">
        <h2 style="font-size:18px">Data</h2>
        <p class="muted" style="font-size:14px;margin-top:8px">Data aplikasi disimpan di database MySQL melalui server.</p>
        <button class="btn btn-danger" style="margin-top:20px" data-action="clear-history">🗑 Hapus History</button>
      </div>
    </div>`;
}

function pageProfile() {
  const u = state.currentUser;
  return `
    ${pageHeader("Profil Saya", "Kelola informasi profil akun.")}
    <div style="max-width:768px">
      <div class="card" style="padding:28px">
        <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:32px">
          <div id="profile-avatar" class="avatar big">${
            state.profilePhoto ? `<img src="${esc(state.profilePhoto)}" alt="Profil" />` : "👤"
          }</div>
          <label class="btn-link" style="margin-top:16px;cursor:pointer;font-size:14px">
            Ganti Foto Profil
            <input id="profile-photo" type="file" accept="image/*" class="hidden" />
          </label>
        </div>

        <div class="field"><label class="lbl">Nama</label><input id="profile-name" class="input" value="${esc(u.name)}" /></div>
        <div class="field"><label class="lbl">Username</label><input id="profile-username" class="input" value="${esc(u.username)}" /></div>
        <div class="field"><label class="lbl">Email</label><input class="input" value="${esc(u.email)}" disabled /></div>
        <div class="field"><label class="lbl">Bio</label><textarea id="profile-bio" class="input" rows="4" placeholder="Tulis bio kamu...">${esc(u.bio)}</textarea></div>

        <button class="btn btn-primary btn-full" data-action="save-profile">Simpan Profil</button>
        <button class="btn btn-danger btn-full" style="margin-top:12px" data-action="logout">Logout</button>
      </div>
    </div>`;
}

function renderPage() {
  const admin = isAdmin();
  switch (state.page) {
    case "games":
      return pageGames();
    case "limit":
      return admin ? pageDashboard() : pageLimit();
    case "timer":
      return admin ? pageDashboard() : pageTimer();
    case "history":
      return pageHistory();
    case "statistics":
      return pageStatistics();
    case "break":
      return admin ? pageDashboard() : pageBreak();
    case "users":
      return admin ? pageUsers() : pageDashboard();
    case "monitoring":
      return admin ? pageMonitoring() : pageDashboard();
    case "settings":
      return pageSettings();
    case "profile":
      return pageProfile();
    default:
      return pageDashboard();
  }
}

function gameModalHtml() {
  const editing = state.editingGameId !== null;
  return `
    <div class="modal-bg" style="z-index:60">
      <div class="game-modal">
        <div class="modal-head">
          <div>
            <h2>${editing ? "Edit Game" : "Tambah Game"}</h2>
            <p class="small" style="margin-top:4px">Atur informasi dan foto game.</p>
          </div>
          <button class="close-btn" data-action="close-game-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="field"><label class="lbl">Nama Game</label><input id="game-name" class="input" placeholder="Contoh: Cyberpunk 2077" /></div>
          <div class="field"><label class="lbl">Genre</label><input id="game-genre" class="input" placeholder="Contoh: RPG" /></div>
          <div class="field"><label class="lbl">Deskripsi</label><textarea id="game-desc" class="input" rows="5" placeholder="Masukkan deskripsi game..."></textarea></div>
          <div class="field">
            <label class="lbl">Foto / Cover Game</label>
            <label class="upload">
              <div><div style="font-size:30px;margin-bottom:8px">🖼</div>
              <p style="font-weight:500;color:#334155">Klik untuk memilih gambar</p>
              <p class="small" style="margin-top:4px">Maksimal 2 MB</p></div>
              <input id="game-image" type="file" accept="image/*" />
            </label>
          </div>
          <div id="game-preview">${
            state.gameImage
              ? `<p class="muted small" style="margin-top:8px">Preview:</p><div class="preview"><img src="${esc(state.gameImage)}" alt="Preview game" /></div>`
              : ""
          }</div>
          <div class="modal-actions">
            <button class="btn btn-soft" data-action="close-game-modal">Batal</button>
            <button class="btn btn-primary" data-action="save-game">${editing ? "Simpan Perubahan" : "Tambah Game"}</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderApp() {
  const user = state.currentUser;
  const admin = isAdmin();

  const navItems = admin
    ? [
        ["dashboard", "Ringkasan", "▦"],
        ["games", "Permainan", "🎮"],
        ["users", "Pemain", "👥"],
        ["monitoring", "Sesi", "◉"],
        ["statistics", "Pencapaian", "🏆"],
        ["history", "Laporan", "▤"],
        ["settings", "Pengaturan", "⚙"],
      ]
    : [
        ["dashboard", "Beranda", "⌂"],
        ["games", "Permainan", "🎮"],
        ["limit", "Atur Batas Waktu", "⏱"],
        ["timer", "Mulai Bermain", "▶"],
        ["history", "History", "▤"],
        ["statistics", "Statistik", "▥"],
        ["break", "Istirahat", "☕"],
        ["settings", "Pengaturan", "⚙"],
      ];

  return `
    <aside class="sidebar ${state.mobileMenu ? "open" : ""}">
      <div class="sidebar-brand">
        <div class="brand-icon">🎮</div>
        <div><p style="font-weight:700">Game Time</p><p class="small">Control</p></div>
      </div>
      <div class="sidebar-body">
        <div class="user-box">
          ${avatarHtml(user.photo, user.name)}
          <div style="min-width:0">
            <p class="truncate" style="font-weight:600">${esc(user.name)}</p>
            <p class="small cap">${esc(user.role)}</p>
          </div>
        </div>
        <nav>
          ${navItems
            .map(
              ([id, label, icon]) =>
                `<button class="nav-btn ${state.page === id ? "active" : ""}" data-action="nav" data-value="${id}"><span>${icon}</span><span>${label}</span></button>`,
            )
            .join("")}
        </nav>
      </div>
      <div class="sidebar-foot">
        <button class="nav-btn ${state.page === "profile" ? "active" : ""}" style="margin:0" data-action="nav" data-value="profile"><span>👤</span><span>Profil</span></button>
      </div>
    </aside>

    <div class="overlay ${state.mobileMenu ? "open" : ""}" data-action="close-menu"></div>

    <div class="content">
      <header class="topbar">
        <button class="menu-btn" data-action="toggle-menu">☰</button>
        <p class="topbar-label small" style="font-size:14px">${admin ? "Administrator Panel" : "User Dashboard"}</p>
        <button class="profile-btn" data-action="nav" data-value="profile">
          ${avatarHtml(user.photo, user.name, "sm")}
          <div class="profile-info">
            <p style="font-size:14px;font-weight:600">${esc(user.name)}</p>
            <p class="small">@${esc(user.username)}</p>
          </div>
        </button>
      </header>
      <main>${renderPage()}</main>
    </div>

    ${state.gameModal && admin ? gameModalHtml() : ""}`;
}

function render() {
  document.documentElement.dataset.theme = state.currentUser
    ? state.theme || "dark"
    : "dark";

  $("app").innerHTML = state.currentUser ? renderApp() : renderLogin();
}
