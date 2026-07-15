const API_TXT_URL = "https://raw.githubusercontent.com/ZalRyuichi/Store/main/api.txt";
let API_BASE = "";

async function loadApiBase() {
  const CACHE_TTL = 1 * 60 * 1000;
  try {
    const cached   = localStorage.getItem("pg_api_base");
    const cachedAt = parseInt(localStorage.getItem("pg_api_base_ts") || "0");
    const cacheOk  = cached && (Date.now() - cachedAt < CACHE_TTL);
    if (cacheOk) API_BASE = cached.trim();

    const res = await fetch(API_TXT_URL + "?t=" + Date.now());
    if (res.ok) {
      const url = (await res.text()).trim();
      if (url && url.startsWith("http")) {
        API_BASE = url;
        localStorage.setItem("pg_api_base", url);
        localStorage.setItem("pg_api_base_ts", Date.now().toString());
      }
    }
  } catch {
    const cached = localStorage.getItem("pg_api_base");
    if (cached) API_BASE = cached.trim();
  }
}

function apiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

const TOKEN = localStorage.getItem('pg_token');
if (!TOKEN) window.location.href = '/login.html';

const H = { 'Content-Type': 'application/json', 'x-auth-token': TOKEN };

// Cegat SEMUA request yang pake header H (artinya request ke API kita
// yang butuh login). Kalau server balikin 401/403 -- entah karena token
// gak pernah valid, atau sesi udah expired/ke-reset (server restart, dsb)
// -- langsung logout & tendang ke halaman login. Gak perlu cek manual
// di tiap halaman lagi.
const _origFetch = window.fetch.bind(window);
window.fetch = function (input, init) {
  return _origFetch(input, init).then((res) => {
    const isAuthedCall = init && init.headers === H;
    if (isAuthedCall && (res.status === 401 || res.status === 403)) {
      logout();
      return new Promise(() => {}); // hentikan chain, halaman lagi redirect
    }
    return res;
  });
};
let pollInterval = null;
let timerInterval = null;
let currentTx = null;
let _notifCallback = null;

const savedUser = localStorage.getItem('pg_user') || 'User';
document.addEventListener('DOMContentLoaded', async () => {
  await loadApiBase();
  const nameEl = document.getElementById('profile-name-el');
  if (nameEl) nameEl.textContent = savedUser;
  if (typeof onApiReady === 'function') onApiReady();
  refreshSewaBotFloating();
});

function logout() {
  localStorage.removeItem('pg_token');
  localStorage.removeItem('pg_user');
  window.location.href = '/login.html';
}

function rupiah(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function formatCountdown(s) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

async function loadSaldo(retry = 2) {
  try {
    const res = await fetch(apiUrl('/api/balance'), { headers: H });
    const data = await res.json();
    if (data.ok) {
      const el = document.getElementById('saldo-display');
      if (el) el.textContent = rupiah(data.balance ?? 0);
    }
  } catch {
    if (retry > 0) {
      localStorage.removeItem("pg_api_base_ts");
      await loadApiBase();
      return loadSaldo(retry - 1);
    }
    toast('Gagal memuat saldo, coba refresh', 'error');
  }
}

// Tampilkan / sembunyikan tombol mengambang "Sewa Bot WhatsApp"
// sesuai status masa aktif sewa bot user. Dipanggil otomatis saat
// halaman dimuat, dan juga bisa dipanggil ulang setelah pembelian.
async function refreshSewaBotFloating() {
  if (location.pathname.toLowerCase().endsWith('whatsapp.html')) return;
  try {
    const res = await fetch(apiUrl('/api/sewabot/info'), { headers: H });
    if (!res.ok) return;
    const data = await res.json();

    let btn = document.getElementById('sewabot-fab');
    if (data.ok && data.active) {
      if (!btn) {
        btn = document.createElement('a');
        btn.id = 'sewabot-fab';
        btn.className = 'sewabot-fab';
        btn.title = 'Sewa Bot WhatsApp';
        btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i>';
        btn.href = 'whatsapp.html';
        document.body.appendChild(btn);
      }
    } else if (btn) {
      btn.remove();
    }
  } catch {}
}

function toast(msg, type = 'info') {
  const icons = {
    success: '<i class="fa-solid fa-circle-check" style="color:#16a34a"></i>',
    error:   '<i class="fa-solid fa-circle-xmark" style="color:#dc2626"></i>',
    info:    '<i class="fa-solid fa-circle-info" style="color:#2563eb"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation" style="color:#d97706"></i>'
  };
  const titles = { success: 'Berhasil', error: 'Gagal', info: 'Info', warning: 'Perhatian' };
  document.getElementById('notif-icon-wrap').innerHTML = icons[type] || icons.info;
  document.getElementById('notif-icon-wrap').className = `notif-icon-wrap ${type}`;
  document.getElementById('notif-title').textContent = titles[type] || 'Info';
  document.getElementById('notif-title').className = `notif-title ${type}`;
  document.getElementById('notif-desc').textContent = msg;
  document.getElementById('notif-btn-ok').className = `notif-btn-ok ${type}`;
  document.getElementById('notif-overlay').classList.add('show');
}
function closeNotif() {
  document.getElementById('notif-overlay').classList.remove('show');
  if (_notifCallback) { _notifCallback(); _notifCallback = null; }
}

function startTimer(expiredAt) {
  stopTimer();
  const timerBox = document.getElementById('timer-box');
  const timerDisplay = document.getElementById('timer-display');
  function tick() {
    const rem = Math.floor((new Date(expiredAt) - Date.now()) / 1000);
    if (rem <= 0) {
      timerDisplay.textContent = '00:00';
      timerBox.className = 'timer-box urgent';
      stopTimer();
      if (currentTx && currentTx.status === 'pending') {
        setModalStatus('expired');
        toast('Transaksi Sudah Expired', 'warning');
        document.getElementById('btn-cancel').disabled = true;
        stopPolling();
      }
      return;
    }
    timerDisplay.textContent = formatCountdown(rem);
    timerBox.className = rem <= 60 ? 'timer-box urgent' : 'timer-box';
  }
  tick();
  timerInterval = setInterval(tick, 1000);
}
function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function openModal(tx, titleText, subText) {
  currentTx = tx;
  document.getElementById('modal-title').textContent = titleText || 'Scan QRIS';
  document.getElementById('modal-sub').textContent   = subText || 'Scan QR Di Bawah Untuk Membayar';
  document.getElementById('modal-amount').textContent = rupiah(tx.total_payment || tx.amount);
  document.getElementById('modal-orderid').textContent = 'Order ID: ' + tx.order_id;
  const canvas = document.getElementById('qr-canvas');
  canvas.innerHTML = '';
  new QRCode(canvas, { text: tx.qr_string, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
  document.getElementById('btn-cancel').disabled = false;
  document.getElementById('btn-cancel-text').textContent = 'Batalkan Transaksi';
  setModalStatus('waiting');
  if (tx.expired_at) startTimer(tx.expired_at);
  document.getElementById('modal-overlay').classList.add('show');
  startPolling(tx.order_id);
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  stopPolling(); stopTimer(); currentTx = null;
}

function downloadQR() {
  const canvas = document.querySelector('#qr-canvas canvas');
  if (!canvas) { toast('QR Belum Siap', 'error'); return; }
  const link = document.createElement('a');
  link.download = 'QRIS-' + (currentTx?.order_id || 'payment') + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function zoomQR() {
  const srcCanvas = document.querySelector('#qr-canvas canvas');
  if (!srcCanvas) { toast('QR Belum Siap', 'error'); return; }
  const target = document.getElementById('qr-zoom-canvas');
  target.innerHTML = '';
  new QRCode(target, { text: currentTx.qr_string, width: 280, height: 280, correctLevel: QRCode.CorrectLevel.M });
  document.getElementById('qr-zoom-overlay').classList.add('show');
}
function closeZoomQR() {
  document.getElementById('qr-zoom-overlay').classList.remove('show');
}
function setModalStatus(s) {
  const row = document.getElementById('modal-status');
  const map = {
    waiting:   { cls: 'waiting',   html: '<div class="pulse"></div><span>Menunggu Pembayaran...</span>' },
    done:      { cls: 'done',      html: '<i class="fa-solid fa-circle-check"></i><span>Pembayaran Berhasil!</span>' },
    cancelled: { cls: 'cancelled', html: '<i class="fa-solid fa-circle-xmark"></i><span>Transaksi Dibatalkan</span>' },
    expired:   { cls: 'cancelled', html: '<i class="fa-solid fa-clock"></i><span>Transaksi Expired</span>' },
  };
  const m = map[s] || map.waiting;
  row.className = 'status-row ' + m.cls;
  row.innerHTML = m.html;
}

function startPolling(order_id) {
  stopPolling();
  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(apiUrl(`/api/status/${order_id}`), { headers: H });
      const data = await res.json();
      if (data.ok) {
        if (data.transaction.status === 'completed') {
          setModalStatus('done');
          toast('Pembayaran Berhasil Diterima!', 'success');
          stopPolling(); stopTimer();
          document.getElementById('btn-cancel').disabled = true;
          document.getElementById('timer-box').className = 'timer-box done';
          loadSaldo();
          if (typeof onPaymentCompleted === 'function') onPaymentCompleted(data.transaction);
        } else if (data.transaction.status === 'cancelled') {
          setModalStatus('cancelled');
          stopPolling(); stopTimer();
          document.getElementById('btn-cancel').disabled = true;
        }
      }
    } catch {}
  }, 4000);
}
function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

async function doCancel() {
  if (!currentTx) return;
  const btn = document.getElementById('btn-cancel');
  const btnText = document.getElementById('btn-cancel-text');
  btn.disabled = true; btnText.textContent = 'Membatalkan...';
  try {
    const res = await fetch(apiUrl('/api/cancel'), { method: 'POST', headers: H, body: JSON.stringify({ order_id: currentTx.order_id }) });
    const data = await res.json();
    if (data.ok) {
      setModalStatus('cancelled');
      toast('Transaksi Berhasil Dibatalkan', 'info');
      stopPolling(); stopTimer();
      document.getElementById('timer-box').className = 'timer-box done';
    } else {
      toast(data.message || 'Gagal Membatalkan Transaksi', 'error');
      btn.disabled = false; btnText.textContent = 'Batalkan Transaksi';
    }
  } catch {
    toast('Koneksi Gagal', 'error');
    btn.disabled = false; btnText.textContent = 'Batalkan Transaksi';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const ov = document.getElementById('modal-overlay');
  if (ov) ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });


});
