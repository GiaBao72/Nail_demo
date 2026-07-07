// ═══════════════════════════════════════
//  config.js — Hằng số & Telegram
// ═══════════════════════════════════════

// ── TELEGRAM (đọc từ cài đặt, không hardcode) ──
function getTgConfig() {
  return {
    token: localStorage.getItem('nt_tg_token') || '',
    group: localStorage.getItem('nt_tg_group') || '',
    dm:    localStorage.getItem('nt_tg_dm')    || '',
  };
}

function sendTelegramMsgTo(chatId, text) {
  const { token } = getTgConfig();
  if (!token || !chatId) return;
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  }).catch(() => {});
}

function sendTelegramMsg(text) {
  const { token, group, dm } = getTgConfig();
  if (!token) return;
  [group, dm].filter(Boolean).forEach(chatId => sendTelegramMsgTo(chatId, text));
}

// ── APP CONSTANTS ──
const MAX_BUSY_MS = 60 * 60 * 1000; // 1 giờ

const DEFAULT_SVCS = [
  { v: 'Manicure',    l: '💅 Manicure' },
  { v: 'Pedicure',    l: '🦶 Pedicure' },
  { v: 'SpaPedicure', l: '🛁 Spa Pedicure' },
  { v: 'Fullset',     l: '💎 Fullset' },
  { v: 'Fillin',      l: '✨ Fill-in' },
  { v: 'DipPowder',   l: '🌸 Dip Powder' },
  { v: 'Waxing',      l: '🪡 Waxing' },
];
