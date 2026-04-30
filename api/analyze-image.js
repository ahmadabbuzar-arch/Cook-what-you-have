export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, mimeType } = req.body;
  if (!image || !mimeType) {
    return res.status(400).json({ error: 'Missing image or mimeType' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: 'Look at this image and list all food ingredients you can see. Return ONLY a JSON array of ingredient names in English, lowercase, no explanation, no markdown. Example: ["potato","tomato","onion"]. If no food visible, return [].'
              },
              {
                inline_data: { mime_type: mimeType, data: image }
              }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    if (data.error) {
      return res.status(500).json({ error: 'Gemini API error: ' + data.error.message });
    }

    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const match = txt.match(/\[[\s\S]*?\]/);
    const ingredients = match ? JSON.parse(match[0]) : [];

    res.status(200).json({ ingredients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
