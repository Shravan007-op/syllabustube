const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;
const MAX_BODY_SIZE_BYTES = 2 * 1024 * 1024;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || [];
  const validTimestamps = record.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return true;
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

exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin;
  const allowedOrigin = resolveAllowedOrigin(origin);

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are supported.' },
      }),
    };
  }

  const clientIp =
    event.headers['x-forwarded-for']?.split(',')[0].trim() ||
    event.headers['client-ip'] ||
    'unknown';

  if (!checkRateLimit(clientIp)) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment.' },
      }),
    };
  }

  const scriptUrl =
    process.env.VITE_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbwPiLzm4X9unGh8YmHeKUIs-XE9O6Jq6E5q239LNTVE9uNOjt7QQY5A4OTxYbCb7exy/exec';

  try {
    const rawBody = event.body || '{}';
    if (rawBody.length > MAX_BODY_SIZE_BYTES) {
      return {
        statusCode: 413,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: { code: 'FILE_TOO_LARGE', message: 'Payload exceeds 2 MB limit.' },
        }),
      };
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: { code: 'INVALID_JSON', message: 'Payload must be valid JSON.' },
        }),
      };
    }

    if (!payload || typeof payload !== 'object' || typeof payload.action !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: { code: 'INVALID_PAYLOAD', message: 'Payload must contain an "action" field.' },
        }),
      };
    }

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

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: {
          code: 'NETWORK',
          message: 'Could not connect to backend service. Please try again.',
        },
      }),
    };
  }
};
