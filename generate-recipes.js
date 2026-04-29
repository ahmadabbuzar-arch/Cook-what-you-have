export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ingredients } = req.body;
  if (!ingredients || !ingredients.length) {
    return res.status(400).json({ error: 'No ingredients provided' });
  }

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'Groq API key not configured' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        max_tokens: 1500,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: `Generate 3 home cooking recipes using these ingredients: ${ingredients.join(', ')}.
Respond ONLY with a valid JSON array (no markdown, no explanation):
[{"title":"...","time":20,"cal":250,"servings":2,"rating":4.5,"veg":true,"healthy":false,"emoji":"🍛","ingredients":["..."],"steps":["Detailed step 1","Detailed step 2","Detailed step 3","Detailed step 4","Detailed step 5"],"tips":"..."}]`
        }]
      })
    });

    if (!response.ok) throw new Error(`Groq error ${response.status}`);

    const data = await response.json();
    const txt = data.choices[0].message.content.trim();
    const match = txt.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON in response');

    const recipes = JSON.parse(match[0]);
    res.status(200).json({ recipes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
