// In-memory rate limiting store for serverless instance lifetime
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60;
const MAX_BODY_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || [];
  const validTimestamps = record.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);

  // Periodic cleanup if map grows
  if (rateLimitMap.size > 1000) {
    for (const [key, times] of rateLimitMap.entries()) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitMap.delete(key);
      }
    }
  }
  return true;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function resolveAllowedOrigin(reqOrigin) {
  const configured = process.env.ALLOWED_ORIGIN;
  if (!configured || configured.trim() === '*' || configured.trim() === '') {
    return reqOrigin || '*';
  }
  const allowed = configured.split(',').map((o) => o.trim().toLowerCase());
  if (reqOrigin && allowed.includes(reqOrigin.toLowerCase())) {
    return reqOrigin;
  }
  return allowed[0] || '*';
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowedOrigin = resolveAllowedOrigin(origin);

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Proxy-Secret');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST requests are supported.',
      },
    });
  }

  // Basic IP Rate Limiting
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please slow down and try again shortly.',
      },
    });
  }

  const scriptUrl =
    process.env.VITE_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbwPiLzm4X9unGh8YmHeKUIs-XE9O6Jq6E5q239LNTVE9uNOjt7QQY5A4OTxYbCb7exy/exec';

  try {
    let payload = {};
    if (typeof req.body === 'string') {
      if (req.body.length > MAX_BODY_SIZE_BYTES) {
        return res.status(413).json({
          ok: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Request payload exceeds maximum allowed size of 2 MB.',
          },
        });
      }
      try {
        payload = JSON.parse(req.body);
      } catch {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Request payload must be valid JSON.',
          },
        });
      }
    } else if (req.body && typeof req.body === 'object') {
      payload = req.body;
    } else {
      payload = {};
    }

    // Input validation
    if (!payload || typeof payload !== 'object' || typeof payload.action !== 'string') {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Request payload must be an object with an "action" field.',
        },
      });
    }

    // Inject proxy secret if configured
    if (process.env.PROXY_SECRET) {
      payload._proxySecret = process.env.PROXY_SECRET.trim();
    }

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const data = await response.text();
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(data);
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: {
        code: 'NETWORK',
        message: 'Could not connect to the backend service. Please check your connection and retry.',
      },
    });
  }
}
