// ═══════════════════════════════════════
//  config.js — Hằng số & Telegram
// ═══════════════════════════════════════

// ── TELEGRAM ──
// TODO (bảo mật): chuyển token ra biến môi trường / backend proxy
const TELEGRAM_BOT_TOKEN  = '8796284072:AAF7x6OA2Lh1IwsnhBbUtS50PgoRc5MN1dg';
const TELEGRAM_CHAT_GROUP = '-5122704943'; // group Nail_demo
const TELEGRAM_CHAT_DM    = '1375328147';  // DM cá nhân

function sendTelegramMsgTo(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return;
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  }).catch(() => {});
}

function sendTelegramMsg(text) {
  if (!TELEGRAM_BOT_TOKEN) return;
  [TELEGRAM_CHAT_GROUP, TELEGRAM_CHAT_DM].forEach(chatId => sendTelegramMsgTo(chatId, text));
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
