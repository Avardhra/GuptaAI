import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { password, promptBaru } = req.body;

  if (password !== "AKSES-RAHASIA-999") {
    return res.status(401).json({ error: "Password salah" });
  }

  const filePath = path.join(process.cwd(), "config", "kepribadian.json");

  const dataBaru = {
    systemPrompt: promptBaru,
  };

  fs.writeFileSync(filePath, JSON.stringify(dataBaru, null, 2), "utf8");

  return res.json({ success: true, message: "Kepribadian berhasil diubah!" });
}
