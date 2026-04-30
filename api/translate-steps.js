module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const { steps, title, recipeId } = body || {};
  if (!steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: 'Missing steps array' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
  }

  const prompt = `You are a cooking assistant. Translate these cooking steps for the recipe "${title}" into simple Hindi (Devanagari script). Keep it short, simple and easy to understand for home cooks.

Steps to translate:
${steps.map((s, i) => `${i+1}. ${s}`).join('\n')}

Return ONLY a valid JSON array of translated Hindi strings, one per step, in the same order. No explanation, no markdown, no extra text. Example format: ["हिंदी स्टेप 1","हिंदी स्टेप 2"]`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
        })
      }
    );

    const data = await response.json();
    if (data.error) {
      return res.status(500).json({ error: 'Gemini error: ' + data.error.message });
    }

    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    // Extract JSON array from response
    const match = txt.match(/\[[\s\S]*?\]/);
    let stepsHi = [];
    try {
      stepsHi = match ? JSON.parse(match[0]) : [];
    } catch(e) {
      stepsHi = [];
    }

    return res.status(200).json({ stepsHi, recipeId });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
