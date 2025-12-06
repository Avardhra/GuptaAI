// server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createWorker } from "tesseract.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

// CORS untuk frontend Vite
app.use(
  cors({
    origin: "http://localhost:5173", // sesuaikan kalau port Vite beda
    credentials: true,
  })
);

// parse JSON body
app.use(express.json());

// folder sementara untuk upload
const uploadFolder = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// multer config (simpan file sementara di ./uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// worker Tesseract (OCR lokal)
// catatan: ini bisa lumayan berat, jalan di backend saja
let ocrWorker = null;
const getWorker = async () => {
  if (!ocrWorker) {
    ocrWorker = await createWorker("eng+ind"); // english + indonesia
  }
  return ocrWorker;
};

// health check
app.get("/api/ping", (req, res) => {
  res.json({ ok: true });
});

// === ENDPOINT OCR: terima gambar, balikan teks ===
app.post("/api/ocr", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "file tidak ditemukan" });
    }

    const worker = await getWorker();
    const imagePath = req.file.path;

    const result = await worker.recognize(imagePath);
    const text = result.data.text || "";

    // hapus file sementara
    fs.unlink(imagePath, () => {});

    return res.json({ text });
  } catch (err) {
    console.error("OCR error:", err);
    return res.status(500).json({ error: "gagal OCR" });
  }
});

// === ENDPOINT OCR-LOG: simpan teks hasil OCR (opsional) ===
app.post("/api/ocr-log", (req, res) => {
  try {
    const { email, text, time } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "text wajib diisi" });
    }

    const logFolder = path.join(__dirname, "dataLogin");
    if (!fs.existsSync(logFolder)) {
      fs.mkdirSync(logFolder);
    }

    const logFile = path.join(logFolder, "ocr-log.json");
    let data = [];
    if (fs.existsSync(logFile)) {
      const raw = fs.readFileSync(logFile, "utf-8");
      data = raw ? JSON.parse(raw) : [];
    }

    data.push({
      email: email || "guest",
      text,
      time: time || Date.now(),
    });

    fs.writeFileSync(logFile, JSON.stringify(data, null, 2), "utf-8");
    return res.json({ ok: true });
  } catch (err) {
    console.error("OCR log error:", err);
    return res.status(500).json({ error: "gagal simpan log" });
  }
});

// TODO: di sini kamu bisa gabungkan endpoint lain, misal:
// - /api/login
// - /api/signup
// - /api/history
// sesuai server.js yang dulu sudah kamu pakai.

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
