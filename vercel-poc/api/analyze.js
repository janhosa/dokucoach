const Anthropic = require('@anthropic-ai/sdk');
const { Client } = require('@notionhq/client');
const formidable = require('formidable');
const fs = require('fs');

module.exports.config = { api: { bodyParser: false } };

const NOTION_DB_ID = 'bb6794c6fb8e4ac094f160a2e505e036';

const PROMPT = `Du bist DokuCoach – österreichischer Versicherungs- und Vertragsexperte.
Analysiere dieses Dokument präzise. Nur Fakten aus dem Dokument, keine Annahmen.

WICHTIGE REGELN:
- KFZ: motorbezogene Versicherungssteuer ist SEPARAT von der Versicherungsprämie. Beide zusammen = Gesamtzahlung. Nie als Preissteigerung interpretieren.
- Monatliche Kosten = Gesamtjahreskosten / 12 (inkl. aller Steuern/Gebühren)
- Österreichisches Recht und Versicherungspraxis anwenden

Antworte NUR mit validem JSON, kein Text davor oder danach:
{
  "name": "Kurzer Dokumentname",
  "kategorie": "🏠 Versicherung",
  "typ": "Polizze",
  "anbieter": "Anbietername",
  "zusammenfassung": "2-3 Sätze: Was ist das, was schützt/regelt es?",
  "monatliche_kosten": 0.00,
  "gueltig_bis": "YYYY-MM-DD oder null",
  "wichtige_klauseln": "Kernpunkte: Summen, Selbstbehalt, Ausschlüsse, Besonderheiten",
  "was_du_hast": [
    { "name": "Leistung", "detail": "Erklärung", "betrag": "€ X.XXX", "status": "ok" }
  ],
  "was_tun": [
    { "nr": 1, "titel": "Handlung", "detail": "Warum und wie" }
  ]
}

Kategorie: "🏠 Versicherung" | "📋 Vertrag" | "🏛️ Behörde" | "💳 Finanzen" | "📁 Sonstiges"
Typ: "Polizze" | "Mietvertrag" | "Kaufvertrag" | "Arbeitsvertrag" | "Bescheid" | "Kreditvertrag" | "Kontovertrag" | "Abo/Service" | "Sonstiges"
Status in was_du_hast: "ok" | "warn" | "no"`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Parse multipart form
    const form = new formidable.IncomingForm({ maxFileSize: 10 * 1024 * 1024 });
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const email = String(fields.email || fields.email?.[0] || '').trim().toLowerCase();
    const pdfFile = files.pdf?.[0] || files.pdf;

    if (!email) return res.status(400).json({ error: 'E-Mail fehlt' });
    if (!pdfFile) return res.status(400).json({ error: 'Kein PDF hochgeladen' });

    // PDF → base64
    const filePath = pdfFile.filepath || pdfFile.path;
    const pdfBase64 = fs.readFileSync(filePath).toString('base64');

    // Claude-Analyse
    const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: PROMPT }
        ]
      }]
    });

    // JSON parsen – robust gegen trailing commas und Sonderzeichen
    const raw = message.content[0].text;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Keine JSON-Antwort von Claude erhalten');

    let jsonStr = match[0];
    // Trailing commas vor ] oder } entfernen (häufiger Claude-Fehler)
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    let analysis;
    try {
      analysis = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message);
      console.error('Raw response length:', raw.length);
      throw new Error('Claude-Antwort konnte nicht verarbeitet werden. Bitte nochmal versuchen.');
    }

    // Notion-Eintrag anlegen
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const today = new Date().toISOString().split('T')[0];

    const props = {
      'Dokument':          { title: [{ text: { content: analysis.name || 'Unbenannt' } }] },
      'Anbieter':          { rich_text: [{ text: { content: analysis.anbieter || '' } }] },
      'Status':            { select: { name: '✅ Analysiert' } },
      'Wichtige Klauseln': { rich_text: [{ text: { content: (analysis.wichtige_klauseln || '').slice(0, 2000) } }] },
      'User':              { email: email },
      'Analysiert am':     { date: { start: today } }
    };

    if (analysis.kategorie) props['Kategorie'] = { select: { name: analysis.kategorie } };
    if (analysis.typ)       props['Typ']       = { select: { name: analysis.typ } };
    if (analysis.monatliche_kosten > 0) props['Monatliche Kosten'] = { number: analysis.monatliche_kosten };
    if (analysis.gueltig_bis) props['Gültig bis'] = { date: { start: analysis.gueltig_bis } };

    const page = await notion.pages.create({
      parent: { database_id: NOTION_DB_ID },
      properties: props
    });

    return res.status(200).json({ success: true, notionUrl: page.url, analysis });

  } catch (err) {
    console.error('analyze error:', err);
    return res.status(500).json({ error: err.message || 'Analyse fehlgeschlagen' });
  }
};
