import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.OTP_SERVER_PORT || 4174);
const OTP_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const otpRecords = new Map();
const resetTokens = new Map();

const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM,
);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hash(value) {
  return createHash('sha256').update(value).digest();
}

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 16_384) throw new Error('Request too large.');
  }
  return JSON.parse(raw || '{}');
}

async function sendOtp(email, otp) {
  if (!transporter) throw new Error('Email service is not configured.');
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Your RupeeFlow password reset code',
    text: `Your RupeeFlow verification code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#172554">
        <h1 style="font-size:22px;margin:0 0 18px">RupeeFlow password reset</h1>
        <p style="color:#475569">Use this verification code to reset your password:</p>
        <div style="font-size:34px;font-weight:700;letter-spacing:8px;padding:18px 20px;background:#ecfdf5;border-left:4px solid #0f766e">${otp}</div>
        <p style="color:#475569">Code expires in 10 minutes. If you did not request this, ignore this email.</p>
      </div>`,
  });
}

async function requestOtp(body, response) {
  const email = normalizeEmail(body.email);
  if (!isEmail(email)) return json(response, 400, { error: 'Enter a valid email address.' });
  if (!transporter) {
    return json(response, 503, {
      error: 'OTP email is not configured. Add SMTP_USER, SMTP_PASS, and SMTP_FROM to the .env file, then restart RupeeFlow.',
    });
  }

  const existing = otpRecords.get(email);
  if (existing && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
    return json(response, 429, { error: `Wait ${retryAfter} seconds before requesting another code.`, retryAfter });
  }

  const otp = String(randomInt(100000, 1000000));
  const salt = randomBytes(16).toString('hex');
  await sendOtp(email, otp);
  otpRecords.set(email, {
    digest: hash(`${salt}:${otp}`),
    salt,
    expiresAt: Date.now() + OTP_TTL_MS,
    sentAt: Date.now(),
    attemptsLeft: MAX_ATTEMPTS,
  });
  return json(response, 200, { ok: true, expiresIn: OTP_TTL_MS / 1000, resendAfter: RESEND_COOLDOWN_MS / 1000 });
}

function verifyOtp(body, response) {
  const email = normalizeEmail(body.email);
  const otp = String(body.otp || '').trim();
  const record = otpRecords.get(email);

  if (!record || record.expiresAt <= Date.now()) {
    otpRecords.delete(email);
    return json(response, 400, { error: 'Code expired or not found. Request a new code.' });
  }
  if (!/^\d{6}$/.test(otp)) return json(response, 400, { error: 'Enter the 6-digit verification code.' });

  const candidate = hash(`${record.salt}:${otp}`);
  if (!timingSafeEqual(candidate, record.digest)) {
    record.attemptsLeft -= 1;
    if (record.attemptsLeft <= 0) otpRecords.delete(email);
    return json(response, 400, { error: record.attemptsLeft > 0 ? `Incorrect code. ${record.attemptsLeft} attempts left.` : 'Too many incorrect attempts. Request a new code.' });
  }

  otpRecords.delete(email);
  const token = randomBytes(32).toString('hex');
  resetTokens.set(token, { email, expiresAt: Date.now() + TOKEN_TTL_MS });
  return json(response, 200, { ok: true, resetToken: token });
}

function consumeResetToken(body, response) {
  const email = normalizeEmail(body.email);
  const token = String(body.resetToken || '');
  const record = resetTokens.get(token);
  if (!record || record.email !== email || record.expiresAt <= Date.now()) {
    resetTokens.delete(token);
    return json(response, 401, { error: 'Password reset verification expired. Start again.' });
  }
  resetTokens.delete(token);
  return json(response, 200, { ok: true });
}

setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpRecords) if (record.expiresAt <= now) otpRecords.delete(email);
  for (const [token, record] of resetTokens) if (record.expiresAt <= now) resetTokens.delete(token);
}, 60_000).unref();

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/api/health') {
    return json(response, 200, { ok: true, emailConfigured: smtpConfigured });
  }
  if (request.method !== 'POST') return json(response, 404, { error: 'Not found.' });

  try {
    const body = await readBody(request);
    if (request.url === '/api/auth/request-reset-otp') return await requestOtp(body, response);
    if (request.url === '/api/auth/verify-reset-otp') return verifyOtp(body, response);
    if (request.url === '/api/auth/consume-reset-token') return consumeResetToken(body, response);
    return json(response, 404, { error: 'Not found.' });
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : 500;
    const smtpError = error?.code === 'EAUTH' || error?.command === 'AUTH';
    const message = status === 500
      ? smtpError
        ? 'Email login failed. Check SMTP_USER and Gmail App Password in .env, then restart RupeeFlow.'
        : 'Email could not be sent. Check SMTP settings and internet connection.'
      : 'Invalid request.';
    console.error(error);
    return json(response, status, { error: message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`RupeeFlow OTP server running at http://127.0.0.1:${PORT}`);
  if (!smtpConfigured) console.warn('SMTP not configured. Copy .env.example to .env and add email credentials.');
});
