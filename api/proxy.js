// In-memory stores for rate limiting and daily caps within serverless instance lifetime
const rateLimitMap = new Map(); // Sliding window for burst requests (60/min)
const dailyGlobalMap = new Map(); // 'YYYY-MM-DD' -> count
const dailyIpMap = new Map(); // 'YYYY-MM-DD:ip' -> count

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60;
const MAX_BODY_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const DEFAULT_GLOBAL_DAILY_CAP = 50;
const DEFAULT_IP_DAILY_CAP = 25;

function getTodayUtcKey() {
  return new Date().toISOString().slice(0, 10);
}

function getUtcMidnightIso() {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow.toISOString();
}

function checkBurstRateLimit(ip) {
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

function sanitizeForLog(value) {
  let text = String(value ?? '');
  const proxySecret = process.env.PROXY_SECRET ? process.env.PROXY_SECRET.trim() : '';
  if (proxySecret) {
    text = text.split(proxySecret).join('[REDACTED_SECRET]');
  }
  text = text.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]');
  return text;
}

function resolveAllowedOrigin(reqOrigin) {
  const configured = process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGINS;
  if (!configured || configured.trim() === '*' || configured.trim() === '') {
    return reqOrigin || '*';
  }
  const allowed = configured
    .split(',')
    .map((o) => o.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.includes('*')) {
    return reqOrigin || '*';
  }
  if (reqOrigin && allowed.includes(reqOrigin.toLowerCase())) {
    return reqOrigin;
  }
  return '';
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowedOrigin = resolveAllowedOrigin(origin);

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Proxy-Secret');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only POST requests are supported.',
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST requests are supported.',
      },
    });
  }

  // 1. Sliding window burst rate limit (per minute)
  const clientIp = getClientIp(req);
  if (!checkBurstRateLimit(clientIp)) {
    console.error(`[Proxy Error] RATE_LIMITED: Burst limit exceeded for IP ${sanitizeForLog(clientIp)}`);
    return res.status(429).json({
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down and try again shortly.',
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please slow down and try again shortly.',
      },
    });
  }

  const scriptUrl = (process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL || '').trim();
  if (!scriptUrl) {
    console.error(`[Proxy Error] SERVER_NOT_CONFIGURED: Missing APPS_SCRIPT_URL environment variable (IP: ${sanitizeForLog(clientIp)})`);
    return res.status(500).json({
      ok: false,
      code: 'SERVER_NOT_CONFIGURED',
      message: 'Backend is not configured.',
      error: {
        code: 'SERVER_NOT_CONFIGURED',
        message: 'Backend is not configured.',
      },
    });
  }

  try {
    let payload = {};
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_SIZE_BYTES) {
        console.error(`[Proxy Error] FILE_TOO_LARGE from IP ${sanitizeForLog(clientIp)}`);
        return res.status(413).json({
          ok: false,
          code: 'FILE_TOO_LARGE',
          message: 'Request payload exceeds maximum allowed size of 2 MB.',
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Request payload exceeds maximum allowed size of 2 MB.',
          },
        });
      }
      try {
        payload = JSON.parse(req.body);
      } catch {
        console.error(`[Proxy Error] INVALID_JSON from IP ${sanitizeForLog(clientIp)}`);
        return res.status(400).json({
          ok: false,
          code: 'INVALID_JSON',
          message: 'Request payload must be valid JSON.',
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
      console.error(`[Proxy Error] INVALID_PAYLOAD from IP ${sanitizeForLog(clientIp)}`);
      return res.status(400).json({
        ok: false,
        code: 'UNKNOWN',
        message: 'Request payload must be an object with an "action" field.',
        error: {
          code: 'UNKNOWN',
          message: 'Request payload must be an object with an "action" field.',
        },
      });
    }

    // 2. Daily Analysis Cap Checks (for 'analyseSyllabus')
    const isAnalysisAction = payload.action === 'analyseSyllabus';
    const todayKey = getTodayUtcKey();
    const globalCap = parseInt(process.env.DAILY_ANALYSIS_CAP || String(DEFAULT_GLOBAL_DAILY_CAP), 10);
    const ipCap = DEFAULT_IP_DAILY_CAP;

    const currentGlobal = dailyGlobalMap.get(todayKey) || 0;
    const ipKey = `${todayKey}:${clientIp}`;
    const currentIp = dailyIpMap.get(ipKey) || 0;

    // If capped, we instruct backend to serve ONLY if cached
    if (isAnalysisAction && (currentGlobal >= globalCap || currentIp >= ipCap)) {
      payload._onlyIfCached = true;
    }

    // Inject proxy secret and client info
    if (process.env.PROXY_SECRET) {
      payload._proxySecret = process.env.PROXY_SECRET.trim();
    }
    payload._clientIp = clientIp;

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const rawData = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(rawData);
    } catch (e) {}

    if (!parsed || typeof parsed !== 'object') {
      const sanitizedSnippet = sanitizeForLog(rawData).slice(0, 200);
      console.error(
        `[Proxy Upstream Error] IP: ${sanitizeForLog(clientIp)} | Action: ${sanitizeForLog(payload.action)} | Code: BACKEND_INVALID_RESPONSE | Status: ${response.status} | Body: ${sanitizedSnippet}`
      );
      return res.status(502).json({
        ok: false,
        code: 'BACKEND_INVALID_RESPONSE',
        message: 'The backend returned an unreadable response.',
        error: {
          code: 'BACKEND_INVALID_RESPONSE',
          message: 'The backend returned an unreadable response.',
        },
      });
    }

    // Check if backend returned RATE_LIMITED due to onlyIfCached or daily cap
    const backendCode = parsed?.code || parsed?.error?.code;
    if (parsed && !parsed.ok && backendCode === 'RATE_LIMITED') {
      const resetTime = getUtcMidnightIso();
      console.error(`[Proxy Error] RATE_LIMITED: Daily cap reached for IP ${sanitizeForLog(clientIp)}`);
      return res.status(429).json({
        ok: false,
        code: 'RATE_LIMITED',
        message: `Daily syllabus analysis limit reached. Resets at ${resetTime}.`,
        resetTime,
        error: {
          code: 'RATE_LIMITED',
          message: `Daily syllabus analysis limit reached. Resets at ${resetTime}.`,
          resetTime,
        },
      });
    }

    if (parsed && !parsed.ok) {
      const errCode = sanitizeForLog(parsed.code || parsed.error?.code || 'UNKNOWN');
      const errMsg = sanitizeForLog(parsed.message || parsed.error?.message || 'Upstream backend error');
      console.error(`[Proxy Upstream Error] IP: ${sanitizeForLog(clientIp)} | Action: ${sanitizeForLog(payload.action)} | Code: ${errCode} | Detail: ${errMsg}`);
    }

    // Server-side logging of quota telemetry
    if (parsed && parsed.telemetry) {
      console.log(
        `[SyllabusTube Telemetry] IP: ${sanitizeForLog(clientIp)} | Action: ${sanitizeForLog(payload.action)} | Gemini calls: ${parsed.telemetry.geminiCallsUsed || 0} | Est. YouTube units: ${parsed.telemetry.estimatedYoutubeUnitsUsed || 0} | Cached: ${Boolean(parsed.telemetry.cached)}`
      );
    }

    // If successful analysis and NOT a cache hit, increment daily usage counters
    const isCacheHit = Boolean(parsed && (parsed.cached === true || parsed.telemetry?.cached === true));
    if (isAnalysisAction && parsed && parsed.ok && !isCacheHit) {
      dailyGlobalMap.set(todayKey, currentGlobal + 1);
      dailyIpMap.set(ipKey, currentIp + 1);
      console.log(`[SyllabusTube Daily Usage] Global: ${currentGlobal + 1}/${globalCap} | IP (${sanitizeForLog(clientIp)}): ${currentIp + 1}/${ipCap}`);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(rawData);
  } catch (err) {
    console.error(`[Proxy Network Error] IP: ${sanitizeForLog(clientIp)} | Detail: ${sanitizeForLog(err?.message || 'Failed to connect')}`);
    return res.status(502).json({
      ok: false,
      code: 'NETWORK',
      message: 'Could not connect to the backend service. Please check your connection and retry.',
      error: {
        code: 'NETWORK',
        message: 'Could not connect to the backend service. Please check your connection and retry.',
      },
    });
  }
}
