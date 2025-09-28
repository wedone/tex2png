const chromium = require('@sparticuz/chromium')
const puppeteer = require('puppeteer-core')
const path = require('path')
const fs = require('fs')
let sharp // lazy require to reduce cold start; will load on demand

// Lazy loaders for MathJax (server-side TeX -> SVG)
let mjLiteAdaptor, mjRegisterHTMLHandler, mjMathJax, mjTeX, mjSVG, mjAllPackages
function ensureMathJax() {
  if (!mjMathJax) {
    mjMathJax = require('mathjax-full/js/mathjax').mathjax
    mjTeX = require('mathjax-full/js/input/tex').TeX
    mjAllPackages = require('mathjax-full/js/input/tex/AllPackages').AllPackages
    mjSVG = require('mathjax-full/js/output/svg').SVG
    mjLiteAdaptor = require('mathjax-full/js/adaptors/liteAdaptor').liteAdaptor
    mjRegisterHTMLHandler = require('mathjax-full/js/handlers/html').RegisterHTMLHandler
  }
}

async function renderPNGWithMathJax(tex, { displayMode, color, bg, fontSize }) {
  ensureMathJax()
  const adaptor = mjLiteAdaptor()
  mjRegisterHTMLHandler(adaptor)

  const sizePx = parseInt(String(fontSize || '32px'), 10) || 32
  const isDisplay = String(displayMode) === 'true'
  const doc = mjMathJax.document('', {
    InputJax: new mjTeX({ packages: mjAllPackages }),
    OutputJax: new mjSVG({ fontCache: 'none' })
  })

  const node = doc.convert(String(tex), { display: isDisplay, em: sizePx, ex: sizePx / 2, containerWidth: 80 * sizePx })
  let svg = adaptor.outerHTML(node)
  // 应用颜色到根 svg（MathJax 使用 currentColor）
  const textColor = color || '#000000'
  if (svg.includes('<svg')) {
    svg = svg.replace('<svg', `<svg style="color:${textColor}"`)
  }

  // 懒加载 sharp
  if (!sharp) sharp = require('sharp')
  const density = 220 // DPI for SVG rasterization
  let pipeline = sharp(Buffer.from(svg), { density })

  if (bg && bg !== 'transparent') {
    pipeline = pipeline.flatten({ background: bg })
  }
  const png = await pipeline.png().toBuffer()
  return png
}

// 生成KaTeX HTML
function renderKatexHTML(tex, opts = {}) {
  // 注意：在 Vercel 环境中，我们需要直接构建 HTML
  // 因为无法在 serverless 环境中使用 katex 模块
  const displayMode = opts.displayMode === 'true'
  const color = opts.color || '#000000'
  
  return `
    <span class="katex ${displayMode ? 'katex-display' : ''}" style="color: ${color};">
      <span class="katex-mathml">
        <math xmlns="http://www.w3.org/1998/Math/MathML">
          <semantics>
            <mrow>
              <mtext>${tex}</mtext>
            </mrow>
            <annotation encoding="application/x-tex">${tex}</annotation>
          </semantics>
        </math>
      </span>
    </span>
  `
}

module.exports = async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { tex, displayMode, color, bg, fontSize, engine } = req.query

  if (!tex) {
    return res.status(400).json({ error: 'Missing tex parameter' })
  }

  let browser = null
  
  try {
    // 引擎选择：mathjax / puppeteer / auto(默认)
    const engineMode = (engine || 'auto').toLowerCase()
    if (engineMode === 'mathjax') {
      const png = await renderPNGWithMathJax(tex, { displayMode, color, bg, fontSize })
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.send(png)
    }
    // 生成安全的 TeX 字符串（避免引号、反斜杠导致脚本错误）
    const texJS = JSON.stringify(String(tex))
    const isDisplay = String(displayMode) === 'true'

    // 构建完整的 HTML 页面，使用 CDN 加载 KaTeX
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
          <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
          <style>
            body { 
              margin: 0; 
              padding: 20px;
              background: ${bg === 'transparent' ? 'transparent' : (bg || 'white')}; 
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .katex { 
              color: ${color || '#000000'}; 
              font-size: ${fontSize || '32px'}; 
            }
            .formula-container { display: inline-block; }
          </style>
        </head>
        <body>
          <div class="formula-container"><div id="formula"></div></div>
          <script>
            (function(){
              try {
                var element = document.getElementById('formula');
                var tex = ${texJS};
                window.katex.render(tex, element, {
                  throwOnError: false,
                  displayMode: ${isDisplay},
                  colorIsTextColor: true,
                  trust: true,
                  strict: false
                });
                window.__katex_done = true;
              } catch (e) {
                window.__katex_error = e && e.message ? String(e.message) : 'Unknown render error';
              }
            })();
          </script>
        </body>
      </html>
    `

  // 在 Vercel 上使用 @sparticuz/chromium 提供的可执行文件
    // 配置 chromium 运行模式，关闭图形相关特性以减少依赖
    chromium.setHeadlessMode = true
    chromium.setGraphicsMode = false

  const executablePath = await chromium.executablePath()

    // 解析 @sparticuz/chromium 模块内置的 lib/bin 绝对路径
    const chromiumIndexPath = require.resolve('@sparticuz/chromium')
    const chromiumBase = path.dirname(chromiumIndexPath)
    const chromiumLib = path.join(chromiumBase, 'lib')
    const chromiumBin = path.join(chromiumBase, 'bin')

    // 在 Vercel/AWS Lambda 环境中确保能找到打包的共享库
    const ldLibraryPath = [
      process.env.LD_LIBRARY_PATH || '',
      chromiumLib,
      chromiumBin,
      '/opt/lib',
      '/opt/bin'
    ].filter(Boolean).join(':')

    // 可选：记录缺失库的提示，帮助诊断（不会暴露给客户端）
    let missingChromiumLib = false
    if (process.env.VERCEL) {
      const libnspr = path.join(chromiumLib, 'libnspr4.so')
      if (!fs.existsSync(libnspr)) {
        missingChromiumLib = true
        console.warn('[chromium] libnspr4.so not found at', libnspr)
      }
    }

    // 如果处于 auto 模式，且检测到关键库缺失，则直接使用 MathJax 避免 Puppeteer 冷启失败
    if (engineMode === 'auto' && missingChromiumLib) {
      const png = await renderPNGWithMathJax(tex, { displayMode, color, bg, fontSize })
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.send(png)
    }
    // 强制 puppeteer 时尝试启动；auto 模式在库齐全时也会尝试
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 800, deviceScaleFactor: 2 },
      executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
      env: {
        ...process.env,
        LD_LIBRARY_PATH: ldLibraryPath
      }
    })

    const page = await browser.newPage()
    
    // 设置页面内容
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    })

    // 等待 KaTeX 渲染完成或报错标记
    const ok = await page.waitForFunction(
      () => window.__katex_done || window.__katex_error,
      { timeout: 15000 }
    ).catch(() => null)

    if (!ok) {
      throw new Error('KaTeX render timeout')
    }

    const renderError = await page.evaluate(() => window.__katex_error || null)
    if (renderError) {
      throw new Error('KaTeX render failed: ' + renderError)
    }

    // 获取公式元素
    const formulaElement = await page.$('.formula-container')
    
    if (!formulaElement) {
      throw new Error('Formula element not found')
    }

    // 截图
    const image = await formulaElement.screenshot({ 
      type: 'png', 
      omitBackground: bg === 'transparent'
    })

    // 设置响应头
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400') // 缓存 24 小时
    
    // 返回图片
    res.send(image)

  } catch (error) {
    console.error('Render error (puppeteer path):', error)
    // 回退到 MathJax + Sharp 渲染，确保功能可用
    try {
      const png = await renderPNGWithMathJax(tex, { displayMode, color, bg, fontSize })
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.send(png)
    } catch (e2) {
      console.error('Render error (mathjax fallback):', e2)
      res.status(500).send('Render error: ' + (e2?.message || error?.message || 'Unknown error'))
    }
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}