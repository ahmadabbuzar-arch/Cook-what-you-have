module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();
  
  // Only expose what frontend needs - key is never stored in HTML
  return res.status(200).json({
    geminiKey: process.env.GEMINI_API_KEY || ''
  });
};
