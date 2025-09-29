<template>
  <div class="mixed-text-converter">
    <div class="converter-header">
      <h2>混合文本转换器</h2>
      <p>输入包含文本和 LaTeX 公式的内容，自动识别并转换公式为图片</p>
    </div>

    <div class="converter-body">
      <!-- 输入区域 -->
      <div class="input-section">
        <div class="form-group">
          <label for="text-input">混合文本内容：</label>
          <textarea
            id="text-input"
            v-model="inputText"
            @input="debouncedParse"
            placeholder="例如：这是普通文本 $E=mc^2$ 这是行内公式，$$\frac{a}{b}$$ 这是块级公式。"
            class="text-input"
          ></textarea>
          <div class="input-help">
            <p><strong>语法说明：</strong></p>
            <ul>
              <li><code>$公式$</code> - 行内公式</li>
              <li><code>$$公式$$</code> - 块级公式（独立成行）</li>
              <li>例如：<code>$x^2$</code> 或 <code>$$\sum_{i=1}^n i$$</code></li>
            </ul>
          </div>
        </div>

        <!-- 全局参数设置 -->
        <div class="global-params">
          <h3>全局渲染参数</h3>
          <div class="params-grid">
            <div class="param-group">
              <label for="global-font-size">公式字体大小：</label>
              <input
                id="global-font-size"
                type="range"
                min="16"
                max="48"
                v-model="globalParams.fontSize"
                @input="debouncedParse"
              />
              <span class="range-value">{{ globalParams.fontSize }}px</span>
            </div>

            <div class="param-group">
              <label for="global-color">公式颜色：</label>
              <input
                id="global-color"
                type="color"
                v-model="globalParams.color"
                @input="debouncedParse"
              />
            </div>

            <div class="param-group">
              <label>
                <input
                  type="checkbox"
                  v-model="globalParams.transparent"
                  @change="debouncedParse"
                />
                公式透明背景
              </label>
            </div>

            <div class="param-group">
              <label for="global-img-height">图片高度：</label>
              <input
                id="global-img-height"
                type="text"
                v-model="globalParams.imgHeight"
                placeholder="如 1em、32px，可选"
                @input="debouncedParse"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 预览区域 -->
      <div class="preview-section">
        <h3>预览结果</h3>
        
        <!-- 加载状态 -->
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
          <p>正在解析和生成图片...</p>
        </div>

        <!-- 预览内容 -->
        <div v-else-if="parsedContent.length > 0" class="preview-container">
          <div class="rendered-content">
            <div
              v-for="(item, index) in parsedContent"
              :key="index"
              :class="['content-item', item.type]"
            >
              <!-- 普通文本 -->
              <span v-if="item.type === 'text'" class="text-content">
                {{ item.content }}
              </span>
              
              <!-- 行内公式 -->
              <img
                v-else-if="item.type === 'inline-math'"
                :src="item.imageUrl"
                :alt="item.content"
                class="inline-formula"
                @error="handleImageError(index)"
              />
              
              <!-- 块级公式 -->
              <div v-else-if="item.type === 'display-math'" class="display-formula-container">
                <img
                  :src="item.imageUrl"
                  :alt="item.content"
                  class="display-formula"
                  @error="handleImageError(index)"
                />
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="preview-actions">
            <button @click="downloadAsImage" class="btn btn-primary">
              📥 下载为图片
            </button>
            <button @click="copyAsMarkdown" class="btn btn-secondary">
              📋 复制为 Markdown
            </button>
            <button @click="exportAsHtml" class="btn btn-secondary">
              💾 导出为 HTML
            </button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <p>👆 请在上方输入混合文本以开始转换</p>
        </div>
      </div>
    </div>

    <!-- 示例内容 -->
    <div class="examples-section">
      <h3>示例内容</h3>
      <div class="examples-grid">
        <button
          v-for="example in examples"
          :key="example.name"
          @click="useExample(example.content)"
          class="example-btn"
        >
          <span class="example-name">{{ example.name }}</span>
          <div class="example-preview">{{ example.preview }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MixedTextConverter',
  data() {
    return {
      inputText: '',
      parsedContent: [],
      loading: false,
      debounceTimer: null,
      globalParams: {
        fontSize: 24,
        color: '#000000',
        transparent: true,
        imgHeight: '' // 新增图片高度参数
      },
      examples: [
        {
          name: '数学定理',
          preview: '勾股定理：$a^2 + b^2 = c^2$',
          content: '勾股定理是平面几何中的重要定理：$a^2 + b^2 = c^2$。\\n\\n其中 $a$ 和 $b$ 是直角三角形的两直角边，$c$ 是斜边。'
        },
        {
          name: '物理公式',
          preview: '爱因斯坦质能方程...',
          content: '爱因斯坦的质能方程是现代物理学的重要公式：\\n\\n$$E = mc^2$$\\n\\n其中 $E$ 是能量，$m$ 是质量，$c$ 是光速。'
        },
        {
          name: '统计学概念',
          preview: '正态分布的概率密度函数...',
          content: '正态分布的概率密度函数为：\\n\\n$$f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$$\\n\\n其中 $\\mu$ 是均值，$\\sigma$ 是标准差。'
        }
      ]
    }
  },
  methods: {
    debouncedParse() {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(this.parseContent, 800)
    },

    async parseContent() {
      if (!this.inputText.trim()) {
        this.parsedContent = []
        return
      }

      this.loading = true

      try {
        const content = this.inputText.replace(/\\n/g, '\\n') // 处理换行符
        const parsed = await this.parseAndRender(content)
        this.parsedContent = parsed
      } catch (error) {
        console.error('解析内容失败:', error)
      } finally {
        this.loading = false
      }
    },

    async parseAndRender(text) {
      const result = []
      let lastIndex = 0

      // 正则表达式匹配 $...$ 和 $$...$$ ，支持多行
      const mathRegex = /\$\$([\s\S]+?)\$\$|\$([^\$]+?)\$/g
      let match

      while ((match = mathRegex.exec(text)) !== null) {
        // 添加前面的普通文本
        if (match.index > lastIndex) {
          const textContent = text.substring(lastIndex, match.index)
          if (textContent.trim()) {
            result.push({
              type: 'text',
              content: textContent
            })
          }
        }

        // 处理数学公式
        const isDisplay = !!match[1] // $$...$$ 是显示模式
        const formula = match[1] || match[2]
        
        if (formula.trim()) {
          const imageUrl = await this.generateFormulaImage(formula, isDisplay)
          result.push({
            type: isDisplay ? 'display-math' : 'inline-math',
            content: formula,
            imageUrl: imageUrl
          })
        }

        lastIndex = mathRegex.lastIndex
      }

      // 添加最后的普通文本
      if (lastIndex < text.length) {
        const textContent = text.substring(lastIndex)
        if (textContent.trim()) {
          result.push({
            type: 'text',
            content: textContent
          })
        }
      }

      return result
    },

    async generateFormulaImage(formula, isDisplay) {
      const params = new URLSearchParams({
        tex: formula,
        displayMode: isDisplay.toString(),
        fontSize: `${this.globalParams.fontSize}px`,
        color: this.globalParams.color
      })

      if (this.globalParams.transparent) {
        params.append('bg', 'transparent')
      }
      if (this.globalParams.imgHeight) {
        params.append('height', this.globalParams.imgHeight)
      }

      const apiBase = import.meta.env.VITE_API_BASE || ''
      return `${apiBase}/latex?${params.toString()}`
    },

    useExample(content) {
      this.inputText = content
      this.debouncedParse()
    },

    handleImageError(index) {
      // 处理图片加载失败
      console.error(`公式图片加载失败，索引: ${index}`)
    },

    async downloadAsImage() {
      // 这里可以实现将整个预览内容导出为图片的功能
      // 使用 html2canvas 等库
      alert('下载为图片功能开发中...')
    },

    async copyAsMarkdown() {
      let markdown = ''
      
      for (const item of this.parsedContent) {
        if (item.type === 'text') {
          markdown += item.content
        } else if (item.type === 'inline-math') {
          markdown += `$${item.content}$`
        } else if (item.type === 'display-math') {
          markdown += `$$${item.content}$$`
        }
      }

      try {
        await navigator.clipboard.writeText(markdown)
        alert('Markdown 内容已复制到剪贴板')
      } catch (err) {
        console.error('复制失败:', err)
      }
    },

    exportAsHtml() {
      // 生成 HTML 内容并下载
      let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>导出的混合文本</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; padding: 2rem; }
    .inline-formula { vertical-align: middle; }
    .display-formula-container { text-align: center; margin: 1rem 0; }
  </style>
</head>
<body>
`

      for (const item of this.parsedContent) {
        if (item.type === 'text') {
          html += `<span>${item.content.replace(/\\n/g, '<br>')}</span>`
        } else if (item.type === 'inline-math') {
          html += `<img src="${window.location.origin}${item.imageUrl}" alt="${item.content}" class="inline-formula">`
        } else if (item.type === 'display-math') {
          html += `<div class="display-formula-container"><img src="${window.location.origin}${item.imageUrl}" alt="${item.content}"></div>`
        }
      }

      html += '</body></html>'

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mixed-content-${Date.now()}.html`
      link.click()
      URL.revokeObjectURL(url)
    }
  },

  mounted() {
    // 默认示例
    this.inputText = '这是一个包含数学公式的例子：$E=mc^2$ 是著名的质能方程。\\n\\n下面是一个块级公式：\\n\\n$$\\frac{d}{dx}\\int_{a}^{x} f(t)dt = f(x)$$'
    this.parseContent()
  }
}
</script>

<style scoped>
.mixed-text-converter {
  max-width: 1200px;
  margin: 0 auto;
}

.converter-header {
  text-align: center;
  margin-bottom: 2rem;
}

.converter-header h2 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.converter-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

/* 输入区域样式 */
.input-section {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #34495e;
}

.text-input {
  width: 100%;
  height: 200px;
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.3s ease;
}

.text-input:focus {
  outline: none;
  border-color: #667eea;
}

.input-help {
  margin-top: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 0.9rem;
}

.input-help ul {
  margin: 0.5rem 0 0 1rem;
}

.input-help code {
  background: #e9ecef;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

/* 参数设置样式 */
.global-params h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.params-grid {
  display: grid;
  gap: 1rem;
}

.param-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.param-group label {
  font-weight: 500;
  min-width: 100px;
}

.param-group input[type="range"] {
  flex: 1;
}

.param-group input[type="color"] {
  width: 40px;
  height: 30px;
  padding: 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.param-group input[type="text"] {
  flex: 1;
  padding: 0.5rem;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.param-group input[type="text"]:focus {
  outline: none;
  border-color: #667eea;
}

.range-value {
  font-size: 0.9rem;
  color: #666;
  min-width: 40px;
}

/* 预览区域样式 */
.preview-section {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.preview-section h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.loading {
  text-align: center;
  padding: 2rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.preview-container {
  margin-bottom: 1rem;
}

.rendered-content {
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 6px;
  line-height: 1.6;
  margin-bottom: 1rem;
  min-height: 200px;
}

.content-item {
  display: inline;
}

.content-item.display-math {
  display: block;
}

.text-content {
  white-space: pre-line;
}

.inline-formula {
  vertical-align: middle;
  margin: 0 2px;
}

.display-formula-container {
  text-align: center;
  margin: 1rem 0;
}

.display-formula {
  max-width: 100%;
}

.preview-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a67d8;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.empty-state {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 2rem;
}

/* 示例区域样式 */
.examples-section {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.examples-section h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.example-btn {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.example-btn:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.example-name {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.example-preview {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.4;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .converter-body {
    grid-template-columns: 1fr;
  }
  
  .examples-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-actions {
    flex-direction: column;
  }
  
  .param-group {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .param-group input[type="range"] {
    width: 100%;
  }
}
</style>