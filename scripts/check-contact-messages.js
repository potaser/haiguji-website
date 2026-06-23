const fs = require('fs');
const path = require('path');
const net = require('net');
const tls = require('tls');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const MESSAGE_FILE = path.join(DATA_DIR, 'contact-messages.json');
const RECIPIENT = process.env.CONTACT_NOTIFY_TO || 'h4erj@outlook.com';

function readMessages() {
  if (!fs.existsSync(MESSAGE_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(MESSAGE_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function writeMessages(messages) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(MESSAGE_FILE, JSON.stringify(messages, null, 2) + '\n', 'utf8');
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function formatLine(item) {
  const email = item.email || '未填邮箱';
  const phone = item.phone ? `${item.countryCode || ''}${item.phone}` : '未填电话';
  const type = item.inquiryType || '未填写咨询类型';
  const message = String(item.message || '').replace(/\s+/g, ' ').trim();
  return `${item.name}（${email};${phone}）-${type}：${message}`;
}

function smtpCommand(socket, command, expected) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = data => {
      buffer += data.toString('utf8');
      const lines = buffer.trimEnd().split(/\r?\n/);
      const last = lines[lines.length - 1] || '';
      if (!/^\d{3} /.test(last)) return;
      socket.off('data', onData);
      const code = Number(last.slice(0, 3));
      if (!expected.includes(code)) reject(new Error(`SMTP ${command || 'connect'} failed: ${buffer}`));
      else resolve(buffer);
    };
    socket.on('data', onData);
    if (command) socket.write(command + '\r\n');
  });
}

async function sendMail({ subject, text }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  if (!host || !user || !pass || !from) {
    throw new Error('缺少 SMTP 配置：请设置 SMTP_HOST、SMTP_PORT、SMTP_USER、SMTP_PASS、SMTP_FROM');
  }

  let socket = secure ? tls.connect(port, host, { servername: host }) : net.connect(port, host);
  await smtpCommand(socket, '', [220]);
  await smtpCommand(socket, `EHLO ${host}`, [250]);
  if (!secure) {
    await smtpCommand(socket, 'STARTTLS', [220]);
    socket = tls.connect({ socket, servername: host });
    await smtpCommand(socket, `EHLO ${host}`, [250]);
  }
  await smtpCommand(socket, 'AUTH LOGIN', [334]);
  await smtpCommand(socket, Buffer.from(user).toString('base64'), [334]);
  await smtpCommand(socket, Buffer.from(pass).toString('base64'), [235]);
  await smtpCommand(socket, `MAIL FROM:<${from}>`, [250]);
  await smtpCommand(socket, `RCPT TO:<${RECIPIENT}>`, [250, 251]);
  await smtpCommand(socket, 'DATA', [354]);

  const body = [
    `From: ${from}`,
    `To: ${RECIPIENT}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text
  ].join('\r\n');

  await smtpCommand(socket, `${body}\r\n.`, [250]);
  await smtpCommand(socket, 'QUIT', [221]);
  socket.end();
}

async function main() {
  const messages = readMessages();
  const pending = messages.filter(item => !item.notified);
  if (!pending.length) {
    console.log('没有新的联系消息。');
    return;
  }

  const subject = `【海古纪-联系我们】新消息+${pending.length}`;
  const text = pending.map(formatLine).join('\n');
  await sendMail({ subject, text });

  const now = new Date().toISOString();
  const pendingIds = new Set(pending.map(item => item.id));
  const updated = messages.map(item => pendingIds.has(item.id) ? { ...item, notified: true, notifiedAt: now } : item);
  writeMessages(updated);
  console.log(`已发送 ${pending.length} 条联系消息提醒到 ${RECIPIENT}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
