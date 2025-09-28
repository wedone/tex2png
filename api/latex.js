const puppeteer = require('puppeteer')

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

export default async function handler(req, res) {
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
    // 构建完整的 HTML 页面，使用 CDN 加载 KaTeX
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
          <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
          <style>
            body { 
              margin: 0; 
              padding: 20px;
              background: ${bg === 'transparent' ? 'transparent' : (bg || 'white')}; 
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .katex { 
              color: ${color || '#000000'}; 
              font-size: ${fontSize || '32px'}; 
            }
            .formula-container {
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="formula-container">
            <div id="formula"></div>
          </div>
          <script>
            try {
              const element = document.getElementById('formula');
              katex.render('${tex.replace(/'/g, "\\'")}', element, {
                throwOnError: false,
                displayMode: ${displayMode === 'true'},
                colorIsTextColor: true,
                trust: true,
                strict: false
              });
            } catch (e) {
              document.getElementById('formula').textContent = 'Error: ' + e.message;
            }
          </script>
        </body>
      </html>
    `

    // 启动 Puppeteer
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      headless: true
    })

    const page = await browser.newPage()
    
    // 设置页面内容
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    })

    // 等待 KaTeX 渲染完成
    await page.waitForSelector('.katex', { timeout: 10000 })

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
    res.status(500).json({ 
      error: 'Render error: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}