export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  // Demo: anggap semua login valid (asal email & password diisi)
  // Produksi: cek ke database
  return res.status(200).json({
    user: { name: email.split("@")[0], email },
  });
}
