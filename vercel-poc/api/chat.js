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

WICHTIGE REGELN FÜR DEINE ANTWORTEN:
- Schreib wie ein freundlicher Berater im Gespräch – klar, menschlich, direkt.
- Kein Markdown: keine Rauten (#, ##), keine Sternchen (**fett**), keine Bindestriche als Listen.
- Antworte in kurzen Absätzen, getrennt durch Leerzeilen. Maximal 3-4 Absätze.
- Wenn du etwas aufzählen willst, schreib es als normalen Satz: "Erstens... Zweitens... Drittens..."
- Antworte immer auf Deutsch. Wenn etwas nicht im Dokument steht, sag das ehrlich.
- Keine Rechts- oder Finanzberatung – du erklärst und informierst.
- Halte Antworten kurz und auf den Punkt. Lieber eine klare Aussage als drei unsichere.`;

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
