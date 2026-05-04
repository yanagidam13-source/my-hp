/**
 * Vercel Serverless Function — Anthropic API プロキシ
 * process.env.ANTHROPIC_API_KEY を使うため、キーはブラウザに露出しない
 */
module.exports = async function handler(req, res) {
  /* CORS ヘッダー（同一オリジンでも念のため設定） */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  /* プリフライトリクエストへの対応 */
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  /* POST 以外は弾く */
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'サーバーエラーが発生しました', detail: err.message });
  }
};
