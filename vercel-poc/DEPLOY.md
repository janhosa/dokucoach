# DokuCoach POC – Deployment auf Vercel

## Was du brauchst
- [ ] GitHub-Account (kostenlos)
- [ ] Vercel-Account (kostenlos, unter vercel.com)
- [ ] Anthropic API Key
- [ ] Notion Token + Datenbank-ID (haben wir schon)

---

## Schritt 1: GitHub-Repo erstellen

1. Geh auf **github.com → New repository**
2. Name: `dokucoach-poc`
3. Visibility: **Private** (empfohlen für jetzt)
4. Kein README, keine .gitignore
5. **Create repository**

---

## Schritt 2: Code hochladen

Öffne Terminal in deinem Mac und navigiere in den Ordner:

```bash
cd ~/Dropbox/DokuCoach/vercel-poc

git init
git add .
git commit -m "DokuCoach POC - initial"
git branch -M main
git remote add origin https://github.com/DEIN-GITHUB-USERNAME/dokucoach-poc.git
git push -u origin main
```

---

## Schritt 3: Vercel verbinden

1. Geh auf **vercel.com → Add New → Project**
2. **Import Git Repository** → wähle `dokucoach-poc`
3. Framework Preset: **Other** (nicht Next.js!)
4. Root Directory: `.` (leer lassen)
5. Klick **Deploy** – läuft durch und zeigt Fehler (noch keine env vars)

---

## Schritt 4: Environment Variables setzen

In Vercel → dein Projekt → **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | sk-ant-... (dein Key) |
| `NOTION_TOKEN` | secret_... (dein Notion Token) |

Beide als **Production + Preview + Development** hinzufügen.

---

## Schritt 5: Redeploy

Nach dem Setzen der Env Vars:
- Vercel → **Deployments → ... → Redeploy**
- Oder: Mach einen leeren Git Commit:

```bash
git commit --allow-empty -m "trigger redeploy"
git push
```

---

## Schritt 6: Testen

Deine URL sieht aus wie: `https://dokucoach-poc.vercel.app`

1. E-Mail eingeben (deine oder eine Test-Mail)
2. PDF hochladen (z.B. eine Polizze aus dem Polizzen-Ordner)
3. "Dokument analysieren" klicken
4. Nach ~30 Sek: Analyse erscheint
5. In Notion nachschauen: Eintrag mit deiner E-Mail sollte da sein

---

## Bekannte Limits (Vercel Free Plan)
- Max. Ausführungszeit: 60 Sek für Analyse, 30 Sek für Chat ✅ (konfiguriert)
- Max. Dateigröße: 10 MB (konfiguriert)
- 100 GB Bandwidth/Monat (mehr als genug für Tests)

---

## Notion Datenbank
- ID: `bb6794c6fb8e4ac094f160a2e505e036`
- Felder: Dokument, Anbieter, Kategorie, Typ, Status, Monatliche Kosten, Gültig bis, Wichtige Klauseln, User (E-Mail), Analysiert am

---

## Troubleshooting

**"Analyse fehlgeschlagen"** → Meist fehlt API Key oder Notion Token in Vercel Env Vars.

**Timeout** → PDF zu groß oder Claude zu langsam. Max 10 MB, probiere kleinere PDFs zuerst.

**Notion-Eintrag fehlt** → Notion Token prüfen. Der Token muss Zugriff auf die DB haben (in Notion: Integration einladen).
