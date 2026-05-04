const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, analysis, history = [] } = req.body;
    if (!message || !analysis) return res.status(400).json({ error: 'message und analysis fehlen' });

    const systemPrompt = `Du bist DokuCoach – ein freundlicher österreichischer Versicherungsexperte.
Der Nutzer hat folgendes Dokument analysiert:

Dokument: ${analysis.name}
Anbieter: ${analysis.anbieter}
Zusammenfassung: ${analysis.zusammenfassung}
Wichtige Klauseln: ${analysis.wichtige_klauseln}
Leistungen: ${JSON.stringify(analysis.was_du_hast)}

Beantworte Fragen dazu klar, verständlich und auf Österreich bezogen.
Antworte immer auf Deutsch. Wenn du etwas nicht weißt oder es nicht im Dokument steht, sag das ehrlich.
Keine Finanz- oder Rechtsberatung – du erklärst und informierst.`;

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages
    });

    return res.status(200).json({ reply: response.content[0].text });

  } catch (err) {
    console.error('chat error:', err);
    return res.status(500).json({ error: err.message });
  }
};
