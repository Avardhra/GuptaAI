import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import cors from "cors";                 // <-- TAMBAH INI

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());

// izinkan akses dari frontend Vite
app.use(
  cors({
    origin: "http://localhost:5173",     // sesuaikan kalau port Vite beda
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  })
);

// ... lanjutkan sisa server.js kamu (DATA_DIR, USERS_FILE, route /api/login, /api/history, dst)

app.use(bodyParser.json());

// folder & file dasar untuk data login
const DATA_DIR = path.join(__dirname, "dataLogin");
const USERS_FILE = path.join(DATA_DIR, "users.json");

// pastikan folder & file ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]", "utf-8");
}

// nama file riwayat per user
const historyFileFor = (email) =>
  path.join(
    DATA_DIR,
    `history_${(email || "guest").replace(/[^a-zA-Z0-9_.-]/g, "_")}.json`
  );

// helper baca & tulis JSON
const loadJson = (file, fallback) => {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
};

const saveJson = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
};

// catat login user
app.post("/api/login", (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: "name and email required" });
  }

  const users = loadJson(USERS_FILE, []);
  const now = new Date().toISOString();
  const idx = users.findIndex((u) => u.email === email);

  if (idx === -1) {
    users.push({
      name,
      email,
      firstLoginAt: now,
      lastLoginAt: now,
      totalSessions: 1,
    });
  } else {
    users[idx] = {
      ...users[idx],
      name,
      lastLoginAt: now,
      totalSessions: (users[idx].totalSessions || 0) + 1,
    };
  }

  saveJson(USERS_FILE, users);
  res.json({ ok: true });
});

// lihat semua user yang pernah login (opsional, buat admin)
app.get("/api/users", (req, res) => {
  const users = loadJson(USERS_FILE, []);
  res.json(users);
});

// simpan riwayat chat user
app.post("/api/history", (req, res) => {
  const { email, messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }
  const file = historyFileFor(email);
  saveJson(file, messages);
  res.json({ ok: true });
});

// ambil riwayat chat user
app.get("/api/history", (req, res) => {
  const email = req.query.email || "guest";
  const file = historyFileFor(email);
  const messages = loadJson(file, []);
  res.json(messages);
});

// endpoint test
app.get("/api/ping", (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("Server listening on", PORT);
});
