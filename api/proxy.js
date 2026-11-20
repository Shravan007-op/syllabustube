export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const scriptUrl =
    process.env.VITE_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbwPiLzm4X9unGh8YmHeKUIs-XE9O6Jq6E5q239LNTVE9uNOjt7QQY5A4OTxYbCb7exy/exec';

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(req.body),
      redirect: 'follow',
    });

    const data = await response.text();
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(data);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: {
        code: 'PROXY_ERROR',
        message: err && err.message ? err.message : 'Vercel proxy failed',
      },
    });
  }
}
