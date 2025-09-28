const express = require('express');
const puppeteer = require('puppeteer');
const katex = require('katex');
const sharp = require('sharp');

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
  const { tex, displayMode, color, bg, fontSize, height } = req.query;
  if (!tex) return res.status(400).send('Missing tex parameter');

  try {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">
          <style>
            body { margin:0; background:${bg||'transparent'}; }
            .katex { color: ${color||'#222'}; font-size: ${fontSize||'32px'}; }
            #formula { display: inline-block; width: fit-content; line-height: 1; vertical-align: middle;${height ? ` height: ${height};` : ''} }
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
    const boundingBox = await element.boundingBox();
    const imageBuffer = await element.screenshot({
      type: 'png',
      omitBackground: bg === 'transparent',
      clip: boundingBox
    });
    // 用 sharp 自动裁剪透明边缘
    const trimmed = await sharp(imageBuffer).trim().png().toBuffer();
    await browser.close();
    res.set('Content-Type', 'image/png');
    res.send(trimmed);
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
