const katex = require('katex');

module.exports = function handler(req, res) {
  try {
    const params = req.method === 'POST' && req.headers['content-type'] && req.headers['content-type'].includes('application/json')
      ? JSON.parse(req.body || '{}')
      : req.query || {};

    const latex = String(params.latex || params.tex || params.q || '').trim();
    if (!latex) {
      res.statusCode = 400;
      res.end('Missing latex parameter');
      return;
    }

    const displayMode = params.display === '1' || params.display === 'true' || params.displayMode === true || params.displayMode === '1';
    const fontSize = Math.max(8, Number(params.fontSize) || 18);
    const padding = Math.max(0, Number(params.padding) || 2);

    const html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: 'ignore',
      trust: true,
    });

    const estimatedWidth = Math.min(3000, Math.max(120, Math.ceil((latex.length || 10) * (fontSize * 0.6)) + padding * 2));
    const estimatedHeight = Math.max(24, Math.ceil((displayMode ? fontSize * 3 : fontSize * 2) + padding * 2));

    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns='http://www.w3.org/2000/svg' width='${estimatedWidth}' height='${estimatedHeight}'>\n` +
      `  <foreignObject width='100%' height='100%'>\n` +
      `    <div xmlns='http://www.w3.org/1999/xhtml' style='display:inline-block; padding:${padding}px; font-size:${fontSize}px; line-height:1;'>\n` +
      `      <div class="katex-wrap">${html}</div>\n` +
      `    </div>\n` +
      `  </foreignObject>\n` +
      `</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.statusCode = 200;
    res.end(svg);
  } catch (err) {
    console.error('render-svg error', err);
    res.statusCode = 500;
    res.end('Render SVG error: ' + String(err.message || err));
  }
}
