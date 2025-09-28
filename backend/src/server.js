const express = require('express');
const puppeteer = require('puppeteer');
const katex = require('katex');

const app = express();
const PORT = process.env.PORT || 3001;

// 生成KaTeX HTML
function renderKatexHTML(tex, opts) {
  return katex.renderToString(tex, {
    throwOnError: false,
    displayMode: opts.displayMode === 'true',
    colorIsTextColor: true,
    ...opts
  });
}

// /latex?tex=...&displayMode=...&color=...&bg=...&fontSize=...
app.get('/latex', async (req, res) => {
  const { tex, displayMode, color, bg, fontSize } = req.query;
  if (!tex) return res.status(400).send('Missing tex parameter');

  try {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">
          <style>
            body { margin:0; background:${bg||'transparent'}; }
            .katex { color: ${color||'#222'}; font-size: ${fontSize||'32px'}; }
          </style>
        </head>
        <body>
          <div id="formula">${renderKatexHTML(tex, { displayMode, color })}</div>
        </body>
      </html>
    `;
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const element = await page.$('#formula');
    const image = await element.screenshot({ type: 'png', omitBackground: bg === 'transparent' });
    await browser.close();
    res.set('Content-Type', 'image/png');
    res.send(image);
  } catch (e) {
    res.status(500).send('Render error: ' + e.message);
  }
});

app.get('/', (req, res) => {
  res.send('KaTeX to PNG API. Use /latex?tex=...');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
