exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
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
      body: event.body,
      redirect: 'follow',
    });

    const data = await response.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        ok: false,
        error: {
          code: 'PROXY_ERROR',
          message: err && err.message ? err.message : 'Proxy fetch failed',
        },
      }),
    };
  }
};
