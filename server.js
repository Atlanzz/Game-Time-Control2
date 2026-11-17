require("dotenv").config();

const crypto = require("crypto");
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { initDatabase, getPool } = require("./db");

const PORT = Number(process.env.PORT) || 3000;

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn(
    "[!] JWT_SECRET belum diatur di file .env. Memakai kunci acak sementara (user harus login ulang setiap server restart).",
  );
}

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------------- Helper ---------------- */
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const db = () => getPool();

function str(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidImage(value) {
  return value === "" || /^(data:image\/|https?:\/\/)/.test(value);
}

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role,
    bio: row.bio || "",
    photo: row.photo || "",
  };
}

function mapGame(row) {
  return {
    id: row.id,
    name: row.name,
    genre: row.genre,
    description: row.description,
    image: row.image || "",
  };
}

function mapHistory(row) {
  const item = {
    id: row.id,
    gameName: row.game_name,
    date: new Date(row.played_at).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }),
    duration: row.duration,
    status: row.status,
  };

  if (row.username) {
    item.username = row.username;
  }

  return item;
}

function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
}

/* ---------------- Middleware auth ---------------- */
const auth = wrap(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Silakan login terlebih dahulu." });
  }

  let payload;

  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res
      .status(401)
      .json({ message: "Sesi tidak valid atau sudah berakhir." });
  }

  const [rows] = await db().query(
    "SELECT id, username, name, email, role, bio, photo FROM users WHERE id = ?",
    [payload.id],
  );

  if (rows.length === 0) {
    return res.status(401).json({ message: "Akun tidak ditemukan." });
  }

  req.user = rows[0];
  next();
});

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Akses khusus administrator." });
  }

  next();
}

/* ---------------- Auth ---------------- */
app.post(
  "/api/auth/register",
  wrap(async (req, res) => {
    const name = str(req.body.name);
    const username = str(req.body.username);
    const email = str(req.body.email);
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!name || !username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Semua data registrasi wajib diisi." });
    }

    if (name.length > 100 || username.length > 50 || email.length > 120) {
      return res.status(400).json({ message: "Data terlalu panjang." });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
  return res.status(400).json({ message: "Format email tidak valid." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password minimal terdiri dari 6 karakter." });
    }

    const [usernameRows] = await db().query(
      "SELECT id FROM users WHERE username = ?",
      [username],
    );

    if (usernameRows.length > 0) {
      return res.status(409).json({
        message: "Username tersebut sudah digunakan. Silakan pilih username lain.",
      });
    }

    const [emailRows] = await db().query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (emailRows.length > 0) {
      return res.status(409).json({
        message: "Email tersebut sudah terdaftar. Silakan gunakan email lain.",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    try {
      await db().query(
        "INSERT INTO users (username, name, email, password_hash, role, bio, photo) VALUES (?, ?, ?, ?, 'user', '', '')",
        [username, name, email, hash],
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ message: "Username atau email sudah digunakan." });
      }

      throw error;
    }

    res.status(201).json({ message: "Akun berhasil dibuat." });
  }),
);

app.post(
  "/api/auth/login",
  wrap(async (req, res) => {
    const username = str(req.body.username);
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi." });
    }

    const [rows] = await db().query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    const user = rows[0];
    const valid = user && (await bcrypt.compare(password, user.password_hash));

    if (!valid) {
      return res.status(401).json({
        message:
          "Username atau password salah. Silakan periksa kembali data login kamu.",
      });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

app.post(
  "/api/auth/forgot",
  wrap(async (req, res) => {
    const email = str(req.body.email);

    if (!email) {
      return res.status(400).json({ message: "Masukkan email terlebih dahulu." });
    }

    const [rows] = await db().query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Email tersebut belum terdaftar pada sistem." });
    }

    res.json({
      message:
        "Permintaan reset password diterima. Silakan hubungi administrator untuk melanjutkan proses reset password.",
    });
  }),
);

/* ---------------- Profil ---------------- */
app.get("/api/me", auth, (req, res) => {
  res.json(publicUser(req.user));
});

app.put(
  "/api/me",
  auth,
  wrap(async (req, res) => {
    const name = str(req.body.name);
    const username = str(req.body.username);
    const bio = typeof req.body.bio === "string" ? req.body.bio : "";
    const photo = typeof req.body.photo === "string" ? req.body.photo : "";

    if (!name || !username) {
      return res.status(400).json({ message: "Nama dan username wajib diisi." });
    }

    if (name.length > 100 || username.length > 50 || bio.length > 1000) {
      return res.status(400).json({ message: "Data terlalu panjang." });
    }

    if (!isValidImage(photo)) {
      return res.status(400).json({ message: "Format foto tidak valid." });
    }

    const [used] = await db().query(
      "SELECT id FROM users WHERE username = ? AND id <> ?",
      [username, req.user.id],
    );

    if (used.length > 0) {
      return res
        .status(409)
        .json({ message: "Username tersebut sudah digunakan." });
    }

    await db().query(
      "UPDATE users SET name = ?, username = ?, bio = ?, photo = ? WHERE id = ?",
      [name, username, bio, photo, req.user.id],
    );

    const [rows] = await db().query(
      "SELECT id, username, name, email, role, bio, photo FROM users WHERE id = ?",
      [req.user.id],
    );

    res.json(publicUser(rows[0]));
  }),
);

/* ---------------- Game ---------------- */
function readGameBody(body) {
  return {
    name: str(body.name),
    genre: str(body.genre),
    description: str(body.description),
    image: typeof body.image === "string" ? body.image : "",
  };
}

function validateGame(game) {
  if (!game.name || !game.genre || !game.description) {
    return "Nama, genre, dan deskripsi game wajib diisi.";
  }

  if (game.name.length > 100 || game.genre.length > 50) {
    return "Nama atau genre terlalu panjang.";
  }

  if (!isValidImage(game.image)) {
    return "Format gambar tidak valid.";
  }

  return null;
}

app.get(
  "/api/games",
  auth,
  wrap(async (req, res) => {
    const [rows] = await db().query("SELECT * FROM games ORDER BY id ASC");
    res.json(rows.map(mapGame));
  }),
);

app.post(
  "/api/games",
  auth,
  adminOnly,
  wrap(async (req, res) => {
    const game = readGameBody(req.body);
    const error = validateGame(game);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const image =
      game.image ||
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=900";

    const [result] = await db().query(
      "INSERT INTO games (name, genre, description, image) VALUES (?, ?, ?, ?)",
      [game.name, game.genre, game.description, image],
    );

    res.status(201).json({ id: result.insertId, ...game, image });
  }),
);

app.put(
  "/api/games/:id",
  auth,
  adminOnly,
  wrap(async (req, res) => {
    const game = readGameBody(req.body);
    const error = validateGame(game);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const [existing] = await db().query("SELECT * FROM games WHERE id = ?", [
      req.params.id,
    ]);

    if (existing.length === 0) {
      return res.status(404).json({ message: "Game tidak ditemukan." });
    }

    const image = game.image || existing[0].image;

    await db().query(
      "UPDATE games SET name = ?, genre = ?, description = ?, image = ? WHERE id = ?",
      [game.name, game.genre, game.description, image, req.params.id],
    );

    res.json({ id: Number(req.params.id), ...game, image });
  }),
);

app.delete(
  "/api/games/:id",
  auth,
  adminOnly,
  wrap(async (req, res) => {
    const [result] = await db().query("DELETE FROM games WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Game tidak ditemukan." });
    }

    res.json({ message: "Game berhasil dihapus." });
  }),
);

/* ---------------- Pengguna (admin) ---------------- */
app.get(
  "/api/users",
  auth,
  adminOnly,
  wrap(async (req, res) => {
    const [rows] = await db().query(
      "SELECT id, username, name, email, role, bio, photo FROM users ORDER BY id ASC",
    );

    res.json(rows.map(publicUser));
  }),
);

app.delete(
  "/api/users/:id",
  auth,
  adminOnly,
  wrap(async (req, res) => {
    if (Number(req.params.id) === req.user.id) {
      return res
        .status(400)
        .json({ message: "Akun yang sedang digunakan tidak dapat dihapus." });
    }

    const [result] = await db().query("DELETE FROM users WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    res.json({ message: "Pengguna berhasil dihapus." });
  }),
);

/* ---------------- Riwayat ---------------- */
const HISTORY_STATUS = ["Sedang bermain", "Selesai", "Batas tercapai"];

app.get(
  "/api/history",
  auth,
  wrap(async (req, res) => {
    let rows;

    if (req.user.role === "admin") {
      [rows] = await db().query(
        `SELECT h.id, h.game_name, h.played_at, h.duration, h.status, u.username
         FROM history h JOIN users u ON u.id = h.user_id
         ORDER BY h.id ASC`,
      );
    } else {
      [rows] = await db().query(
        `SELECT id, game_name, played_at, duration, status
         FROM history WHERE user_id = ? ORDER BY id ASC`,
        [req.user.id],
      );
    }

    res.json(rows.map(mapHistory));
  }),
);

app.post(
  "/api/history",
  auth,
  wrap(async (req, res) => {
    const gameName = str(req.body.gameName);

    if (!gameName || gameName.length > 100) {
      return res.status(400).json({ message: "Nama game tidak valid." });
    }

    const [result] = await db().query(
      "INSERT INTO history (user_id, game_name, duration, status) VALUES (?, ?, 0, 'Sedang bermain')",
      [req.user.id, gameName],
    );

    const [rows] = await db().query(
      "SELECT id, game_name, played_at, duration, status FROM history WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json(mapHistory(rows[0]));
  }),
);

app.put(
  "/api/history/:id",
  auth,
  wrap(async (req, res) => {
    const duration = Number(req.body.duration);
    const status = str(req.body.status);

    if (!Number.isInteger(duration) || duration < 0 || duration > 100000) {
      return res.status(400).json({ message: "Durasi tidak valid." });
    }

    if (!HISTORY_STATUS.includes(status)) {
      return res.status(400).json({ message: "Status tidak valid." });
    }

    const [result] = await db().query(
      "UPDATE history SET duration = ?, status = ? WHERE id = ? AND user_id = ?",
      [duration, status, req.params.id, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Riwayat tidak ditemukan." });
    }

    res.json({ message: "Riwayat diperbarui." });
  }),
);

app.delete(
  "/api/history",
  auth,
  wrap(async (req, res) => {
    if (req.user.role === "admin") {
      await db().query("DELETE FROM history");
    } else {
      await db().query("DELETE FROM history WHERE user_id = ?", [req.user.id]);
    }

    res.json({ message: "History berhasil dihapus." });
  }),
);

/* ---------------- Fallback & error ---------------- */
app.use("/api", (req, res) => {
  res.status(404).json({ message: "Endpoint tidak ditemukan." });
});

app.use((error, req, res, next) => {
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Ukuran data terlalu besar." });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Format data tidak valid." });
  }

  console.error(error);
  res.status(500).json({ message: "Terjadi kesalahan pada server." });
});

/* ---------------- Start ---------------- */

if (process.env.VERCEL) {
  module.exports = app;
} else {
  initDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Gagal menyiapkan database:", error.message);
      console.error("Pastikan MySQL sudah berjalan dan isi file .env sudah benar.");
      process.exit(1);
    });
}
