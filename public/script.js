/* =========================================================
   Game Time Control - versi server (Node.js + Express + MySQL)
   Data disimpan di database lewat API. Tampilan ada di views.js.
   ========================================================= */

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900";

const TOKEN_KEY = "game_time_token";
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

/* ---------------- State ---------------- */
const state = {
  users: [],
  games: [],
  history: [],
  currentUser: null,
  theme: "dark",

  page: "dashboard",
  loginMode: "login",
  search: "",
  mobileMenu: false,

  selectedGame: "",
  activeHistoryId: null,
  gameLimit: 60,
  timerSeconds: 0,
  timerRunning: false,
  timerFinished: false,

  breakMinutes: 10,
  breakSeconds: 0,
  breakRunning: false,

  gameModal: false,
  editingGameId: null,
  gameImage: "",

  profilePhoto: "",
};

let timerInterval = null;
let breakInterval = null;
let toastTimeout = null;

/* ---------------- API ---------------- */
async function api(method, url, body) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  let response;

  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error("Tidak dapat terhubung ke server.");
  }

  let data = {};

  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }

  if (!response.ok) {
    if (response.status === 401 && !url.startsWith("/api/auth/")) {
      sessionExpired();
    }

    const error = new Error(data.message || "Terjadi kesalahan pada server.");
    error.status = response.status;
    throw error;
  }

  return data;
}

async function loadData() {
  const requests = [api("GET", "/api/games"), api("GET", "/api/history")];

  if (isAdmin()) {
    requests.push(api("GET", "/api/users"));
  }

  const [games, history, users] = await Promise.all(requests);

  state.games = games;
  state.history = history;
  state.users = users || [];
}

async function refreshHistory() {
  state.history = await api("GET", "/api/history");
}

/* ---------------- Helper ---------------- */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function $(id) {
  return document.getElementById(id);
}

function val(id) {
  const el = $(id);
  return el ? el.value : "";
}

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const r = minutes % 60;
  return r === 0 ? `${h} jam` : `${h} jam ${r} menit`;
}

function isAdmin() {
  return state.currentUser && state.currentUser.role === "admin";
}

function totalPlayedMinutes() {
  return state.history.reduce((t, i) => t + i.duration, 0);
}

function mostPlayedGame() {
  if (state.history.length === 0) return "-";
  const counter = {};
  state.history.forEach((i) => {
    counter[i.gameName] = (counter[i.gameName] || 0) + i.duration;
  });
  const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]);
  return sorted[0] ? sorted[0][0] : "-";
}

function avatarHtml(photo, name, extra = "") {
  return `<div class="avatar ${extra}">${
    photo ? `<img src="${esc(photo)}" alt="${esc(name)}" />` : "👤"
  }</div>`;
}

function imgTag(src, alt) {
  return `<img src="${esc(src)}" alt="${esc(alt)}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />`;
}

/* ---------------- Notifikasi & Popup ---------------- */
function showNotification(message) {
  const toast = $("toast");
  toast.innerHTML = `
    <div class="toast-box">
      <span class="dot">●</span>
      <p>${esc(message)}</p>
      <button data-action="close-toast">×</button>
    </div>`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => (toast.innerHTML = ""), 3500);
}

function showPopup(title, message, type = "info") {
  const icon = type === "error" ? "!" : type === "success" ? "✓" : "i";
  $("popup").innerHTML = `
    <div class="modal-bg">
      <div class="popup-box">
        <div class="popup-icon ${type}">${icon}</div>
        <h2>${esc(title)}</h2>
        <p>${esc(message)}</p>
        <button class="btn btn-primary btn-full" data-action="close-popup">Tutup</button>
      </div>
    </div>`;
}

function closePopup() {
  $("popup").innerHTML = "";
}

/* ---------------- Auth ---------------- */
function resetSession() {
  stopIntervals();
  localStorage.removeItem(TOKEN_KEY);
  state.currentUser = null;
  state.users = [];
  state.games = [];
  state.history = [];
  state.page = "dashboard";
  state.timerRunning = false;
  state.timerSeconds = 0;
  state.timerFinished = false;
  state.selectedGame = "";
  state.activeHistoryId = null;
  state.breakRunning = false;
  state.mobileMenu = false;
  state.gameModal = false;
}

function sessionExpired() {
  if (!state.currentUser) return;
  resetSession();
  render();
  showPopup("Sesi Berakhir", "Silakan login kembali.", "info");
}

async function handleLogin() {
  const username = val("login-username").trim();
  const password = val("login-password");

  if (!username || !password) {
    showPopup("Data Belum Lengkap", "Username dan password wajib diisi.", "error");
    return;
  }

  try {
    const data = await api("POST", "/api/auth/login", { username, password });

    localStorage.setItem(TOKEN_KEY, data.token);
    state.currentUser = data.user;
    state.theme = data.user.theme || "dark";
    state.profilePhoto = data.user.photo;
    state.page = "dashboard";

    await loadData();
    render();
    showNotification(`Selamat datang, ${data.user.name}!`);
  } catch (e) {
    localStorage.removeItem(TOKEN_KEY);
    state.currentUser = null;
    render();
    showPopup("Login Gagal", e.message, "error");
  }
}

async function setTheme(theme) {
  if (!["light", "dark"].includes(theme)) return;

  try {
    await api("PUT", "/api/user/theme", { theme });

    state.theme = theme;
    document.documentElement.dataset.theme = theme;

    render();
    showNotification("Tema berhasil diubah.");
  } catch (e) {
    showPopup("Gagal Mengubah Tema", e.message, "error");
  }
}

async function handleRegister() {
  const name = val("reg-name").trim();
  const username = val("reg-username").trim();
  const email = val("reg-email").trim();
  const password = val("reg-password");
  const confirm = val("reg-confirm");

  if (!name || !username || !email || !password || !confirm) {
    showPopup("Data Belum Lengkap", "Semua data registrasi wajib diisi.", "error");
    return;
  }
  if (password.length < 6) {
    showPopup("Password Terlalu Pendek", "Password minimal terdiri dari 6 karakter.", "error");
    return;
  }
  if (password !== confirm) {
    showPopup("Password Tidak Cocok", "Password dan konfirmasi password harus sama.", "error");
    return;
  }

  try {
    await api("POST", "/api/auth/register", { name, username, email, password });

    state.loginMode = "login";
    render();
    showPopup(
      "Akun Berhasil Dibuat",
      "Akun kamu berhasil dibuat. Silakan login menggunakan username dan password yang baru.",
      "success",
    );
  } catch (e) {
    showPopup("Registrasi Gagal", e.message, "error");
  }
}

async function handleForgot() {
  const email = val("forgot-email").trim();

  if (!email) {
    showPopup("Email Belum Diisi", "Masukkan email terlebih dahulu.", "error");
    return;
  }

  try {
    const data = await api("POST", "/api/auth/forgot", { email });

    state.loginMode = "login";
    render();
    showPopup("Permintaan Diterima", data.message, "success");
  } catch (e) {
    showPopup("Permintaan Gagal", e.message, "error");
  }
}

function logout() {
  resetSession();
  render();
  showNotification("Anda telah logout.");
}

function checkRegisterConfirm() {
  const pass = val("reg-password");
  const confirm = val("reg-confirm");
  const input = $("reg-confirm");
  const hint = $("reg-hint");
  if (!input || !hint) return;

  input.classList.remove("ok", "bad");
  if (!confirm) {
    hint.innerHTML = "";
  } else if (pass !== confirm) {
    input.classList.add("bad");
    hint.className = "hint bad";
    hint.textContent = "Password tidak sama.";
  } else {
    input.classList.add("ok");
    hint.className = "hint ok";
    hint.textContent = "✓ Password cocok.";
  }
}

/* ---------------- Navigasi ---------------- */
async function navigate(target) {
  state.page = target;
  state.mobileMenu = false;
  render();
  window.scrollTo(0, 0);

  if (!state.currentUser) return;

  try {
    if (target === "users" && isAdmin()) {
      state.users = await api("GET", "/api/users");
    } else if (
      ["dashboard", "history", "statistics", "monitoring"].includes(target)
    ) {
      await refreshHistory();
    }

    if (state.page === target) render();
  } catch (e) {
    /* kesalahan sesi sudah ditangani di api() */
  }
}

/* ---------------- Timer ---------------- */
function stopIntervals() {
  clearInterval(timerInterval);
  clearInterval(breakInterval);
  timerInterval = null;
  breakInterval = null;
}

async function finishActiveSession(duration, status) {
  const id = state.activeHistoryId;
  if (!id) return;

  state.activeHistoryId = null;

  try {
    await api("PUT", `/api/history/${id}`, { duration, status });
    await refreshHistory();
  } catch (e) {
    showNotification(e.message);
  }
}

async function startGame(gameName) {
  try {
    const item = await api("POST", "/api/history", { gameName });
    state.activeHistoryId = item.id;
    await refreshHistory();
  } catch (e) {
    showNotification(e.message);
    return;
  }

  state.selectedGame = gameName;
  state.timerSeconds = state.gameLimit * 60;
  state.timerFinished = false;
  state.timerRunning = false;
  clearInterval(timerInterval);

  navigate("timer");
  showNotification(`Timer untuk ${gameName} siap dimulai.`);
}

function updateTimerDisplay() {
  const display = $("timer-display");
  const bar = $("timer-bar");
  if (display) display.textContent = formatTime(state.timerSeconds);
  if (bar) {
    const total = state.gameLimit * 60;
    const pct = total > 0 ? Math.max(0, Math.min(100, (state.timerSeconds / total) * 100)) : 0;
    bar.style.width = pct + "%";
  }
}

function startTimer() {
  if (!state.selectedGame) {
    showNotification("Pilih game terlebih dahulu.");
    return;
  }
  if (state.timerSeconds <= 0) state.timerSeconds = state.gameLimit * 60;

  state.timerFinished = false;
  state.timerRunning = true;
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    state.timerSeconds--;

    if (state.timerSeconds <= 0) {
      state.timerSeconds = 0;
      clearInterval(timerInterval);
      state.timerRunning = false;
      state.timerFinished = true;
      finishActiveSession(state.gameLimit, "Batas tercapai");
      if (state.currentUser && state.page === "timer") render();
      showNotification(`Batas waktu bermain ${state.selectedGame || "game"} telah tercapai.`);
      return;
    }
    updateTimerDisplay();
  }, 1000);

  render();
  showNotification(`Timer ${state.selectedGame} dimulai.`);
}

function pauseTimer() {
  clearInterval(timerInterval);
  state.timerRunning = false;
  render();
  showNotification("Timer dijeda.");
}

function stopTimer() {
  clearInterval(timerInterval);
  state.timerRunning = false;
  const playedSeconds = state.gameLimit * 60 - state.timerSeconds;
  const playedMinutes = Math.max(0, Math.floor(playedSeconds / 60));
  finishActiveSession(playedMinutes, "Selesai");
  render();
  showNotification("Sesi bermain dihentikan.");
}

function resetTimer() {
  clearInterval(timerInterval);
  state.timerRunning = false;
  state.timerFinished = false;
  state.timerSeconds = state.gameLimit * 60;
  render();
  showNotification("Timer telah direset.");
}

function setLimit(minutes, notify = true) {
  state.gameLimit = minutes;
  if (!state.timerRunning) state.timerSeconds = minutes * 60;
  if (notify) showNotification(`Batas waktu diatur menjadi ${formatMinutes(minutes)}.`);
}

/* ---------------- Istirahat ---------------- */
function startBreak() {
  state.breakSeconds = state.breakMinutes * 60;
  state.breakRunning = true;
  clearInterval(breakInterval);

  breakInterval = setInterval(() => {
    state.breakSeconds--;
    if (state.breakSeconds <= 0) {
      state.breakSeconds = 0;
      clearInterval(breakInterval);
      state.breakRunning = false;
      if (state.currentUser && state.page === "break") render();
      showNotification("Waktu istirahat selesai.");
      return;
    }
    const el = $("break-display");
    if (el) el.textContent = formatTime(state.breakSeconds);
  }, 1000);

  render();
  showNotification(`Mode istirahat ${state.breakMinutes} menit dimulai.`);
}

function stopBreak() {
  clearInterval(breakInterval);
  state.breakRunning = false;
  state.breakSeconds = 0;
  render();
}

/* ---------------- Game (admin) ---------------- */
function openGameModal(id = null) {
  state.editingGameId = id;
  const game = state.games.find((g) => g.id === id);
  state.gameImage = game ? game.image : "";
  state.gameModal = true;
  render();
  if (game) {
    $("game-name").value = game.name;
    $("game-genre").value = game.genre;
    $("game-desc").value = game.description;
  }
}

function closeGameModal() {
  state.gameModal = false;
  render();
}

function handleGameImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > MAX_IMAGE_SIZE) {
    showNotification("Ukuran gambar maksimal 2 MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.gameImage = reader.result;
    const preview = $("game-preview");
    if (preview) {
      preview.innerHTML = `<p class="muted small" style="margin-top:8px">Preview:</p><div class="preview"><img src="${reader.result}" alt="Preview game" /></div>`;
    }
  };
  reader.readAsDataURL(file);
}

async function saveGame() {
  const name = val("game-name").trim();
  const genre = val("game-genre").trim();
  const description = val("game-desc").trim();

  if (!name || !genre || !description) {
    showNotification("Nama, genre, dan deskripsi game wajib diisi.");
    return;
  }

  const payload = { name, genre, description, image: state.gameImage };
  const editing = state.editingGameId !== null;

  try {
    if (editing) {
      await api("PUT", `/api/games/${state.editingGameId}`, payload);
    } else {
      await api("POST", "/api/games", payload);
    }

    state.games = await api("GET", "/api/games");
    state.gameModal = false;
    render();
    showNotification(editing ? "Data game berhasil diperbarui." : "Game baru berhasil ditambahkan.");
  } catch (e) {
    showNotification(e.message);
  }
}

async function deleteGame(id) {
  const game = state.games.find((g) => g.id === id);
  if (!game) return;
  if (!window.confirm(`Hapus game "${game.name}" dari daftar permainan?`)) return;

  try {
    await api("DELETE", `/api/games/${id}`);
    state.games = state.games.filter((g) => g.id !== id);
    render();
    showNotification("Game berhasil dihapus.");
  } catch (e) {
    showNotification(e.message);
  }
}

/* ---------------- Pengguna & Profil ---------------- */
async function deleteUser(id) {
  if (state.currentUser && id === state.currentUser.id) {
    showNotification("Akun yang sedang digunakan tidak dapat dihapus.");
    return;
  }
  if (!window.confirm("Hapus akun pengguna ini?")) return;

  try {
    await api("DELETE", `/api/users/${id}`);
    state.users = state.users.filter((u) => u.id !== id);
    await refreshHistory();
    render();
    showNotification("Pengguna berhasil dihapus.");
  } catch (e) {
    showNotification(e.message);
  }
}

function handleProfilePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > MAX_IMAGE_SIZE) {
    showNotification("Ukuran foto maksimal 2 MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.profilePhoto = reader.result;
    const box = $("profile-avatar");
    if (box) box.innerHTML = `<img src="${reader.result}" alt="Profil" />`;
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  if (!state.currentUser) return;

  const name = val("profile-name").trim();
  const username = val("profile-username").trim();
  const bio = val("profile-bio");

  if (!name || !username) {
    showNotification("Nama dan username wajib diisi.");
    return;
  }

  try {
    const updated = await api("PUT", "/api/me", {
      name,
      username,
      bio,
      photo: state.profilePhoto,
    });

    state.currentUser = updated;
    state.users = state.users.map((u) => (u.id === updated.id ? updated : u));
    render();
    showNotification("Profil berhasil disimpan.");
  } catch (e) {
    showNotification(e.message);
  }
}

async function clearHistory() {
  if (!window.confirm("Hapus seluruh history permainan?")) return;

  try {
    await api("DELETE", "/api/history");
    state.history = [];
    state.activeHistoryId = null;
    render();
    showNotification("History berhasil dihapus.");
  } catch (e) {
    showNotification(e.message);
  }
}

/* =========================================================
   EVENT
   ========================================================= */
document.addEventListener("click", (event) => {
  const el = event.target.closest("[data-action]");
  if (!el) return;

  const action = el.dataset.action;
  const value = el.dataset.value;
  const id = el.dataset.id ? Number(el.dataset.id) : null;

  switch (action) {
    case "login": return handleLogin();
    case "register": return handleRegister();
    case "forgot": return handleForgot();
    case "logout": return logout();
    case "mode": state.loginMode = value; return render();
    case "nav": return navigate(value);
    case "toggle-menu": state.mobileMenu = !state.mobileMenu; return render();
    case "close-menu": state.mobileMenu = false; return render();
    case "close-toast": $("toast").innerHTML = ""; return;
    case "close-popup": return closePopup();

    case "start-game": return startGame(value);
    case "start-timer": return startTimer();
    case "pause-timer": return pauseTimer();
    case "stop-timer": return stopTimer();
    case "reset-timer": return resetTimer();
    case "set-limit": setLimit(Number(value)); return render();

    case "set-break": state.breakMinutes = Number(value); return render();
    case "start-break": return startBreak();
    case "stop-break": return stopBreak();

    case "open-game-modal": return openGameModal(id);
    case "close-game-modal": return closeGameModal();
    case "save-game": return saveGame();
    case "delete-game": return deleteGame(id);

    case "delete-user": return deleteUser(id);
    case "save-profile": return saveProfile();
    case "set-theme": return setTheme(value);
    case "clear-history": return clearHistory();
  }
});

document.addEventListener("input", (event) => {
  const t = event.target;

  if (t.id === "search-input") {
    state.search = t.value;
    $("games-grid").innerHTML = gamesGridHtml();
  }

  if (t.id === "limit-range") {
    setLimit(Number(t.value), false);
    $("limit-display").textContent = formatMinutes(state.gameLimit);
  }

  if (t.id === "reg-password" || t.id === "reg-confirm") {
    checkRegisterConfirm();
  }
});

document.addEventListener("change", (event) => {
  const t = event.target;
  if (t.id === "game-image") handleGameImage(event);
  if (t.id === "profile-photo") handleProfilePhoto(event);
  if (t.id === "limit-range") {
    showNotification(`Batas waktu diatur menjadi ${formatMinutes(state.gameLimit)}.`);
    render();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const id = event.target.id;
  if (id === "login-username" || id === "login-password") handleLogin();
  if (id === "reg-confirm") handleRegister();
  if (id === "forgot-email") handleForgot();
});

/* ---------------- Mulai ---------------- */
async function init() {
  document.documentElement.dataset.theme = "dark";

  if (localStorage.getItem(TOKEN_KEY)) {
    try {
      state.currentUser = await api("GET", "/api/me");
      state.theme = state.currentUser.theme || "dark";
      document.documentElement.dataset.theme = state.theme;
      state.profilePhoto = state.currentUser.photo;
      await loadData();
    } catch (e) {
      state.currentUser = null;
      if (e.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
      }
      render();
      showNotification(e.message);
      return;
    }
  }

  render();
}

init();
