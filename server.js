// server.js
import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  })
);

const DATA_DIR = path.join(__dirname, "dataLogin");
const USERS_FILE = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]", "utf-8");
}

const historyFileFor = (email) =>
  path.join(
    DATA_DIR,
    `history_${(email || "guest").replace(/[^a-zA-Z0-9_.-]/g, "_")}.json`
  );

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

/**
 * AUTH: signup & login sederhana (no hash, untuk demo lokal)
 * users.json: [{ name, email, password, firstLoginAt, lastLoginAt, totalSessions }]
 */

// signup
app.post("/api/signup", (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, password required" });
  }

  const users = loadJson(USERS_FILE, []);
  const existing = users.find((u) => u.email === email);
  if (existing) {
    return res.status(400).json({ error: "email already registered" });
  }

  const now = new Date().toISOString();
  users.push({
    name,
    email,
    password, // untuk produksi harus di-hash!
    firstLoginAt: now,
    lastLoginAt: now,
    totalSessions: 1,
  });

  saveJson(USERS_FILE, users);
  res.json({ ok: true, user: { name, email } });
});

// login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  const users = loadJson(USERS_FILE, []);
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) {
    return res.status(404).json({ error: "user not found" });
  }
  const user = users[idx];
  if (user.password !== password) {
    return res.status(401).json({ error: "invalid password" });
  }

  const now = new Date().toISOString();
  users[idx] = {
    ...user,
    lastLoginAt: now,
    totalSessions: (user.totalSessions || 0) + 1,
  };
  saveJson(USERS_FILE, users);

  res.json({ ok: true, user: { name: user.name, email: user.email } });
});

// daftar user (opsional)
app.get("/api/users", (req, res) => {
  const users = loadJson(USERS_FILE, []);
  // jangan kirim password ke frontend
  res.json(users.map(({ password, ...rest }) => rest));
});

// simpan riwayat
app.post("/api/history", (req, res) => {
  const { email, messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }
  const file = historyFileFor(email);
  saveJson(file, messages);
  res.json({ ok: true });
});

// ambil riwayat
app.get("/api/history", (req, res) => {
  const email = req.query.email || "guest";
  const file = historyFileFor(email);
  const messages = loadJson(file, []);
  res.json(messages);
});

// hapus riwayat (reset file jadi [])
app.delete("/api/history", (req, res) => {
  const email = req.query.email || "guest";
  const file = historyFileFor(email);
  saveJson(file, []);
  res.json({ ok: true });
});

// ping test
app.get("/api/ping", (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("Server listening on", PORT);
});
