const chromium = require('@sparticuz/chromium')
const puppeteer = require('puppeteer-core')

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

  const { tex, displayMode, color, bg, fontSize } = req.query

  if (!tex) {
    return res.status(400).json({ error: 'Missing tex parameter' })
  }

  let browser = null
  
  try {
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

    // 在 Vercel/AWS Lambda 环境中确保能找到打包的共享库
    const ldLibraryPath = [
      process.env.LD_LIBRARY_PATH || '',
      '/var/task/node_modules/@sparticuz/chromium/lib',
      '/var/task/node_modules/@sparticuz/chromium/bin',
      '/opt/lib',
      '/opt/bin'
    ].filter(Boolean).join(':')
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
    console.error('Render error:', error)
    res.status(500).send('Render error: ' + (error?.message || 'Unknown error'))
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}