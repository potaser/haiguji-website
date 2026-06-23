const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const MESSAGE_FILE = path.join(DATA_DIR, 'contact-messages.json');
const PORT = Number(process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.pdf': 'application/pdf',
  '.md': 'text/markdown; charset=utf-8'
};

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MESSAGE_FILE)) fs.writeFileSync(MESSAGE_FILE, '[]\n', 'utf8');
}

function readMessages() {
  ensureStore();
  try {
    const data = JSON.parse(fs.readFileSync(MESSAGE_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function writeMessages(messages) {
  ensureStore();
  fs.writeFileSync(MESSAGE_FILE, JSON.stringify(messages, null, 2) + '\n', 'utf8');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function collectBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > limit) {
        reject(new Error('请求内容过大'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function normalizeText(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPhone(countryCode, phone) {
  const raw = String(phone || '').trim();
  if (!raw) return true;
  const normalized = raw.replace(/[\s()-]/g, '');
  const rules = {
    '+86': /^1[3-9]\d{9}$/,
    '+1': /^[2-9]\d{2}[2-9]\d{6}$/,
    '+44': /^7\d{9}$/,
    '+81': /^0?\d{9,10}$/,
    '+65': /^[689]\d{7}$/,
    other: /^\d{6,15}$/
  };
  return (rules[countryCode] || rules.other).test(normalized);
}

function validCountryCode(countryCode) {
  return /^\+[1-9]\d{0,3}$/.test(countryCode);
}

function validateContact(input) {
  const name = normalizeText(input.name, 100);
  const email = normalizeText(input.email, 200);
  const rawCountryCode = normalizeText(input.countryCode || '+86', 20);
  const customCountryCode = normalizeText(input.customCountryCode || '', 20);
  const countryCode = rawCountryCode === 'other' ? customCountryCode : rawCountryCode;
  const phone = normalizeText(input.phone, 80);
  const inquiryTypeValue = normalizeText(input.inquiryType, 100);
  const customInquiryType = normalizeText(input.customInquiryType || input.otherInquiryType, 100);
  const message = normalizeText(input.message, 4000);
  const inquiryType = inquiryTypeValue === 'other' ? customInquiryType : inquiryTypeValue;

  const errors = [];
  if (!name) errors.push('姓名必须填写');
  if (!email && !phone) errors.push('邮箱和手机至少填写一项');
  if (email && !validEmail(email)) errors.push('邮箱格式不正确');
  if (phone && rawCountryCode === 'other' && !validCountryCode(countryCode)) errors.push('国家/地区代码格式不正确');
  if (phone && !validPhone(rawCountryCode, phone)) errors.push('手机格式不正确');
  if (!inquiryType) errors.push('咨询类型必须填写');
  if (!message) errors.push('消息内容必须填写');

  return {
    errors,
    data: { name, email, countryCode, phone, inquiryType, message }
  };
}

async function handleContact(req, res) {
  try {
    const body = await collectBody(req);
    const input = JSON.parse(body || '{}');
    const result = validateContact(input);
    if (result.errors.length) return sendJson(res, 400, { ok: false, errors: result.errors });

    const messages = readMessages();
    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      createdAt: now,
      notified: false,
      notifiedAt: null,
      ...result.data
    };
    messages.push(item);
    writeMessages(messages);
    sendJson(res, 201, { ok: true, id: item.id });
  } catch (error) {
    sendJson(res, 500, { ok: false, errors: [error.message || '提交失败'] });
  }
}

function safePath(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(urlPath, 'http://local').pathname);
  } catch (_) {
    pathname = '/';
  }
  if (pathname === '/') pathname = '/index.html';
  const full = path.normalize(path.join(ROOT, pathname));
  if (!full.startsWith(ROOT)) return null;
  return full;
}

function serveStatic(req, res) {
  const file = safePath(req.url);
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/contact') return handleContact(req, res);
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method not allowed');
});

ensureStore();
server.listen(PORT, () => {
  console.log(`海古纪网站服务已启动：http://localhost:${PORT}`);
});
