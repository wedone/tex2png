import katex from 'katex';
import { Resvg } from '@resvg/resvg-js';

export default async function handler(req, res) {
  try {
    // 支持 GET 或 POST(JSON)
    const params = req.method === 'POST' && req.headers['content-type'] && req.headers['content-type'].includes('application/json')
      ? await new Promise(r => {
          let body = ''; req.on('data', c => body += c); req.on('end', () => r(JSON.parse(body)));
        })
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

    // 使用 KaTeX 渲染为 HTML
    const html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: 'ignore',
      trust: true,
    });

    // 基于公式长度粗略估算画布尺寸（轻量做法）
    const estimatedWidth = Math.min(3000, Math.max(120, Math.ceil((latex.length || 10) * (fontSize * 0.6)) + padding * 2));
    const estimatedHeight = Math.max(24, Math.ceil((displayMode ? fontSize * 3 : fontSize * 2) + padding * 2));

    // 包装到 SVG 的 foreignObject 中，并引入 KaTeX 的 minimal CSS（不依赖外部文件）
    const katexCss = '';
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns='http://www.w3.org/2000/svg' width='${estimatedWidth}' height='${estimatedHeight}'>\n` +
      `  <foreignObject width='100%' height='100%'>\n` +
      `    <div xmlns='http://www.w3.org/1999/xhtml' style='display:inline-block; padding:${padding}px; font-size:${fontSize}px; line-height:1;'>\n` +
      `      <style>${katexCss}</style>\n` +
      `      <div class="katex-wrap">${html}</div>\n` +
      `    </div>\n` +
      `  </foreignObject>\n` +
      `</svg>`;

    // 使用 resvg 将 SVG 渲染为 PNG buffer
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: estimatedWidth }
    });
    const pngData = resvg.render().asPng();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=60'); // 临时缓存 60s
    res.statusCode = 200;
    res.end(Buffer.from(pngData));
  } catch (err) {
    console.error('render api error', err);
    res.statusCode = 500;
    res.end('Render error: ' + String(err.message || err));
  }
}
