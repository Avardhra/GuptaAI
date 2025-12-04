export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  // Contoh: simpan pseudo ke memory (untuk demo)
  // Produksi: simpan ke database (Supabase, PlanetScale, dsb)
  // Di demo ini kita langsung return seolah berhasil
  return res.status(200).json({
    user: { name, email },
  });
}
