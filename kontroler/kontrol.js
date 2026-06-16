const express = require("express");
const router  = express.Router();

const RESET  = "\x1b[0m";
const RED    = "\x1b[31m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const WHITE  = "\x1b[37m";
const BOLD   = "\x1b[1m";

function kaliLog(data, type = "info") {
  const colors = { info: CYAN, success: GREEN, warn: YELLOW, error: RED };
  const color  = colors[type] || CYAN;
  const label  = typeof data === "object" ? JSON.stringify(data) : String(data);
  console.log(`${BOLD}${color}┌──(kontrol㉿ryuichi)-[/home/${label.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "kontrol"}]${RESET}`);
  console.log(`${BOLD}${color}└─$ ${WHITE}${label}${RESET}`);
}

// Token session kontrol (in-memory, cukup buat single owner)
const kontrolSessions = new Set();

// Dummy devices database (ganti dengan database lu kalau ada)
const deviceDatabase = [
  { id: 'device_001', name: 'Samsung Galaxy A55', status: 'online' },
  { id: 'device_002', name: 'Xiaomi Redmi Note 12', status: 'offline' },
  { id: 'device_003', name: 'iPhone 14 Pro', status: 'online' },
];

// ── POST /api/kontrol/login ────────────────────────────────────────────────
// Body: { kode: string }
// Env : KONTROL_CODE (default: "ryuichi2025" kalau belum diset)
router.post("/login", (req, res) => {
  const { kode } = req.body;
  const KONTROL_CODE = process.env.KONTROL_CODE || "ryuichi2025";

  if (!kode) {
    return res.status(400).json({ ok: false, message: "Kode tidak boleh kosong" });
  }
  if (kode !== KONTROL_CODE) {
    kaliLog(`Login Kontrol Gagal: kode salah`, "warn");
    return res.status(401).json({ ok: false, message: "Kode akses salah, coba lagi" });
  }

  // Buat session token
  const token = require("crypto").randomBytes(24).toString("hex");
  kontrolSessions.add(token);

  kaliLog("Login Kontrol Berhasil", "success");
  res.json({ ok: true, token });
});

// ── Middleware auth kontrol ────────────────────────────────────────────────
function kontrolAuth(req, res, next) {
  const token = req.headers["x-kontrol-token"];
  if (!token || !kontrolSessions.has(token)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
  next();
}

// ── POST /api/kontrol/logout ───────────────────────────────────────────────
router.post("/logout", kontrolAuth, (req, res) => {
  const token = req.headers["x-kontrol-token"];
  kontrolSessions.delete(token);
  kaliLog("Logout Kontrol", "info");
  res.json({ ok: true, message: "Logout berhasil" });
});

// ── GET /api/kontrol/verify ────────────────────────────────────────────────
// Cek apakah token masih valid (dipanggil saat kontrol.html load)
router.get("/verify", kontrolAuth, (req, res) => {
  res.json({ ok: true });
});

// ── GET /api/kontrol/devices ───────────────────────────────────────────────
// List semua devices yang terdaftar
router.get("/devices", kontrolAuth, (req, res) => {
  // TODO: Ganti dengan query ke database device lu
  res.json({ ok: true, devices: deviceDatabase });
});

// ── POST /api/kontrol/device/:deviceId/:command ────────────────────────────
// Kirim command ke device tertentu
// Commands: flashlight, lock, unlock, reboot, screenshot, dll
router.post("/device/:deviceId/:command", kontrolAuth, (req, res) => {
  const { deviceId, command } = req.params;
  const token = req.headers["x-kontrol-token"];

  // Validasi device exists
  const device = deviceDatabase.find(d => d.id === deviceId);
  if (!device) {
    return res.status(404).json({ ok: false, message: "Device tidak ditemukan" });
  }

  // Validasi command
  const validCommands = ['flashlight', 'lock', 'unlock', 'reboot', 'screenshot'];
  if (!validCommands.includes(command)) {
    return res.status(400).json({ ok: false, message: "Command tidak valid" });
  }

  // TODO: Implementasi logic kirim command ke device
  // Contoh: kirim via WebSocket, HTTP request ke device, atau message queue

  kaliLog(`Command ${command} dikirim ke ${deviceId}`, "success");
  res.json({ 
    ok: true, 
    message: `Perintah ${command} berhasil dikirim ke ${device.name}`,
    deviceId,
    command,
    timestamp: new Date().toISOString()
  });
});

module.exports = { router, kontrolAuth };
