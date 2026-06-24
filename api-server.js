const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const MESSAGE_FILE = path.join(DATA_DIR, 'contact-messages.json');
const PORT = Number(process.env.PORT || 8080);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://potaser.github.io';
const RESEND_KEY = process.env.RESEND_KEY || '';
const MAIL_TO = process.env.MAIL_TO || '';
const SUMMARY_INTERVAL = Number(process.env.SUMMARY_INTERVAL || 15) * 60 * 1000;

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MESSAGE_FILE)) fs.writeFileSync(MESSAGE_FILE, '[]\n', 'utf8');
}

function readMessages() {
  ensureStore();
  try {
    const d = JSON.parse(fs.readFileSync(MESSAGE_FILE, 'utf8'));
    return Array.isArray(d) ? d : [];
  } catch (_) { return []; }
}

function writeMessages(messages) {
  ensureStore();
  fs.writeFileSync(MESSAGE_FILE, JSON.stringify(messages, null, 2) + '\n', 'utf8');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function collectBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (Buffer.byteLength(body) > limit) { reject(new Error('请求内容过大')); req.destroy(); } });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function normalizeText(v, max = 2000) { return String(v || '').trim().slice(0, max); }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function validPhone(countryCode, phone) {
  const raw = String(phone || '').trim();
  if (!raw) return true;
  const n = raw.replace(/[\s()-]/g, '');
  const rules = { '+86': /^1[3-9]\d{9}$/, '+1': /^[2-9]\d{2}[2-9]\d{6}$/, '+44': /^7\d{9}$/, '+81': /^0?\d{9,10}$/, '+65': /^[689]\d{7}$/, other: /^\d{6,15}$/ };
  return (rules[countryCode] || rules.other).test(n);
}

function validCountryCode(c) { return /^\+[1-9]\d{0,3}$/.test(c); }

function validateContact(input) {
  const name = normalizeText(input.name, 100);
  const email = normalizeText(input.email, 200);
  const rawCC = normalizeText(input.countryCode || '+86', 20);
  const ccc = normalizeText(input.customCountryCode || '', 20);
  const countryCode = rawCC === 'other' ? ccc : rawCC;
  const phone = normalizeText(input.phone, 80);
  const itv = normalizeText(input.inquiryType, 100);
  const cit = normalizeText(input.customInquiryType || input.otherInquiryType, 100);
  const message = normalizeText(input.message, 4000);
  const inquiryType = itv === 'other' ? cit : itv;
  const errors = [];
  if (!name) errors.push('姓名必须填写');
  if (!email && !phone) errors.push('邮箱和手机至少填写一项');
  if (email && !validEmail(email)) errors.push('邮箱格式不正确');
  if (phone && rawCC === 'other' && !validCountryCode(countryCode)) errors.push('国家/地区代码格式不正确');
  if (phone && !validPhone(rawCC, phone)) errors.push('手机格式不正确');
  if (!inquiryType) errors.push('咨询类型必须填写');
  if (!message) errors.push('消息内容必须填写');
  return { errors, data: { name, email, countryCode, phone, inquiryType, message } };
}

async function handleContact(req, res) {
  try {
    const body = await collectBody(req);
    const input = JSON.parse(body || '{}');
    const result = validateContact(input);
    if (result.errors.length) return sendJson(res, 400, { ok: false, errors: result.errors });
    const messages = readMessages();
    const now = new Date().toISOString();
    const item = { id: crypto.randomUUID(), createdAt: now, notified: false, notifiedAt: null, ...result.data };
    messages.push(item);
    writeMessages(messages);
    if (MAIL_TO && RESEND_KEY) scheduleSummary();
    sendJson(res, 201, { ok: true, id: item.id });
  } catch (error) {
    sendJson(res, 500, { ok: false, errors: [error.message || '提交失败'] });
  }
}

function sendResendMail(to, subject, html) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ from: 'onboarding@resend.dev', to, subject, html });
    const opts = {
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { const j = JSON.parse(b); resolve(j); }
        catch (_) { resolve({ raw: b }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Resend API 超时')); });
    req.write(data);
    req.end();
  });
}

let summaryTimer = null;

function scheduleSummary() {
  if (summaryTimer) return;
  summaryTimer = setTimeout(() => {
    summaryTimer = null;
    if (!MAIL_TO || !RESEND_KEY) { return; }
    const messages = readMessages();
    const pending = messages.filter(m => !m.notified);
    if (!pending.length) { return; }
    const lines = pending.map((m, i) =>
      `<tr><td>${i + 1}</td><td>${m.name}</td><td>${m.email || '-'}</td><td>${m.countryCode || ''} ${m.phone || '-'}</td><td>${m.inquiryType}</td><td>${m.message}</td><td>${new Date(m.createdAt).toLocaleString('zh-CN')}</td></tr>`
    ).join('');
    const html = `<h2>海古纪网站 - 新联系消息汇总</h2><p>共有 ${pending.length} 条新消息：</p>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
<thead><tr style="background:#1e3c72;color:#fff"><th>#</th><th>姓名</th><th>邮箱</th><th>电话</th><th>咨询类型</th><th>消息内容</th><th>提交时间</th></tr></thead>
<tbody>${lines}</tbody></table>`;
    const now = new Date().toISOString();
    sendResendMail(MAIL_TO, `【海古纪-联系我们】${pending.length} 条新消息汇总`, html)
      .then(r => {
        if (r && r.id) {
          const updated = messages.map(m => m.notified ? m : { ...m, notified: true, notifiedAt: now });
          writeMessages(updated);
          console.log(`汇总邮件已发送 (${pending.length} 条) 至 ${MAIL_TO}`);
        } else {
          console.error('汇总邮件发送失败:', JSON.stringify(r));
        }
      })
      .catch(err => console.error('汇总邮件发送失败:', err.message));
  }, SUMMARY_INTERVAL);
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': CORS_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400' });
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/api/contact') return handleContact(req, res);
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: false, errors: ['Not found'] }));
});

ensureStore();
server.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  if (!RESEND_KEY) console.log('⚠ RESEND_KEY 未设置，邮件功能不可用。请在 Render Environment 中添加。');
  if (!MAIL_TO) console.log('⚠ MAIL_TO 未设置，邮件功能不可用。请在 Render Environment 中添加。');
  if (RESEND_KEY && MAIL_TO) {
    console.log(`✅ 有表单提交后 ${SUMMARY_INTERVAL / 60000} 分钟发送汇总邮件至 ${MAIL_TO}`);
    const pending = readMessages().filter(m => !m.notified);
    if (pending.length > 0) {
      console.log(`检测到 ${pending.length} 条未发送的待处理消息，启动汇总定时器`);
      scheduleSummary();
    }
  }
});
