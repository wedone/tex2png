const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const katex = require('katex');
const { Resvg } = require('@resvg/resvg-js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const IMAGES_DIR = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

function shaId(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/render-svg', (req, res) => {
  const latex = String(req.query.latex || '').trim();
  if (!latex) return res.status(400).send('Missing latex');
  try {
    const displayMode = req.query.display === '1' || req.query.display === 'true';
    const fontSize = Math.max(8, Number(req.query.fontSize) || 18);
    const padding = Math.max(0, Number(req.query.padding) || 2);
    const html = katex.renderToString(latex, { displayMode, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore', trust: true });
    const estimatedWidth = Math.min(3000, Math.max(120, Math.ceil((latex.length || 10) * (fontSize * 0.6)) + padding * 2));
    const estimatedHeight = Math.max(24, Math.ceil((displayMode ? fontSize * 3 : fontSize * 2) + padding * 2));
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='${estimatedWidth}' height='${estimatedHeight}'>\n  <foreignObject width='100%' height='100%'>\n    <div xmlns='http://www.w3.org/1999/xhtml' style='display:inline-block; padding:${padding}px; font-size:${fontSize}px; line-height:1;'>\n      <div class="katex-wrap">${html}</div>\n    </div>\n  </foreignObject>\n</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err) {
    console.error(err);
    res.status(500).send('render-svg error');
  }
});

app.get('/api/render', (req, res) => {
  const latex = String(req.query.latex || '').trim();
  if (!latex) return res.status(400).send('Missing latex');
  try {
    const displayMode = req.query.display === '1' || req.query.display === 'true';
    const fontSize = Math.max(8, Number(req.query.fontSize) || 18);
    const padding = Math.max(0, Number(req.query.padding) || 2);
    const html = katex.renderToString(latex, { displayMode, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore', trust: true });
    const estimatedWidth = Math.min(3000, Math.max(120, Math.ceil((latex.length || 10) * (fontSize * 0.6)) + padding * 2));
    const estimatedHeight = Math.max(24, Math.ceil((displayMode ? fontSize * 3 : fontSize * 2) + padding * 2));
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='${estimatedWidth}' height='${estimatedHeight}'>\n  <foreignObject width='100%' height='100%'>\n    <div xmlns='http://www.w3.org/1999/xhtml' style='display:inline-block; padding:${padding}px; font-size:${fontSize}px; line-height:1;'>\n      <div class="katex-wrap">${html}</div>\n    </div>\n  </foreignObject>\n</svg>`;
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: estimatedWidth } });
    const pngData = resvg.render().asPng();
    const id = shaId(latex + '|' + displayMode + '|' + fontSize + '|' + padding);
    const filename = `${id}.png`;
    const outPath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(outPath, Buffer.from(pngData));
    const publicUrl = `/images/${filename}`;
    res.json({ url: publicUrl });
  } catch (err) {
    console.error('render error', err);
    res.status(500).send('render error');
  }
});

app.use('/', express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server listening on', port));
