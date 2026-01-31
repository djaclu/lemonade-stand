# Newsletter 3D Site

Single-page site with a title, subtitle, newsletter signup, and an interactive 3D viewer (Three.js). Built with Vite + TypeScript, ready to deploy on Vercel. Newsletter emails can be sent to a live Google Sheet via Google Apps Script.

## Features

- **Title & subtitle** – Editable in HTML or via query params: `?title=…&subtitle=…`
- **Newsletter** – “Join our newsletter” form; submits to a configurable endpoint (e.g. Google Apps Script → Google Sheets)
- **3D viewer** – Load arbitrary GLB/GLTF models; orbit/pan/zoom with mouse or touch (desktop & mobile)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: set VITE_3D_ASSET_URL and/or VITE_GOOGLE_SCRIPT_URL (see below)
npm run dev
```

## 3D model

- **Build-time default:** set `VITE_3D_ASSET_URL` in `.env` to a public GLB/GLTF URL.
- **At runtime:** use query params: `?model=https://example.com/model.glb` or `?asset=…`

Place a GLB/GLTF in `public/` and reference it as `/model.glb` if you prefer a bundled asset.

## Newsletter → Google Sheets

To send signups to a **live Google Sheet** with no backend code:

1. **Create a Google Sheet** and note its ID (from the URL: `docs.google.com/spreadsheets/d/<ID>/edit`).

2. **Extensions → Apps Script.** Replace the default code with:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const email = (e && e.parameter && e.parameter.email) ? e.parameter.email : '';
  if (email) {
    sheet.appendRow([new Date(), email]);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. **Deploy:** Deploy → New deployment → Type: Web app. Set “Execute as” to yourself, “Who has access” to Anyone. Deploy and copy the **Web app URL**.

4. **In this project:** set in `.env`:
   ```env
   VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```
   (Use the full URL you copied.)

5. Rebuild and redeploy. Form submissions will append timestamp + email to your sheet.

## Deploy on Vercel

- Push to GitHub and import the repo in Vercel, or use `vercel` CLI.
- In the project **Environment variables**, add the same `VITE_*` variables you use locally.
- Build command: `npm run build`  
- Output directory: `dist`

## Scripts

| Command        | Description          |
|----------------|----------------------|
| `npm run dev`  | Start dev server     |
| `npm run build`| Type-check + build   |
| `npm run preview` | Preview production build |
