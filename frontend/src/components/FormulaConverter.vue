<template>
  <div class="formula-converter">
    <div class="converter-header">
      <h2>KaTeX 公式转换器</h2>
      <p>输入 LaTeX 数学公式，生成高质量的 PNG 图片</p>
    </div>

    <div class="converter-body">
      <!-- 输入区域 -->
      <div class="input-section">
        <div class="form-group">
          <label for="formula-input">LaTeX 公式：</label>
          <textarea
            id="formula-input"
            v-model="formula"
            @input="debouncedPreview"
            placeholder="例如：E=mc^2 或 \frac{a}{b} 或 \sum_{i=1}^{n} x_i"
            class="formula-input"
          ></textarea>
        </div>

        <!-- 参数设置 -->
        <div class="params-section">
          <h3>渲染参数</h3>
          <div class="params-grid">
            <div class="param-group">
              <label for="display-mode">显示模式：</label>
              <select id="display-mode" v-model="params.displayMode" @change="debouncedPreview">
                <option value="false">行内模式</option>
                <option value="true">显示模式</option>
              </select>
            </div>

            <div class="param-group">
              <label for="font-size">字体大小：</label>
              <input
                id="font-size"
                type="range"
                min="16"
                max="72"
                v-model="params.fontSize"
                @input="debouncedPreview"
              />
              <span class="range-value">{{ params.fontSize }}px</span>
            </div>

            <div class="param-group">
              <label for="color">文字颜色：</label>
              <input
                id="color"
                type="color"
                v-model="params.color"
                @input="debouncedPreview"
              />
            </div>

            <div class="param-group">
              <label for="bg-color">背景颜色：</label>
              <input
                id="bg-color"
                type="color"
                v-model="params.bgColor"
                @input="debouncedPreview"
              />
            </div>

            <div class="param-group">
              <label>
                <input
                  type="checkbox"
                  v-model="params.transparent"
                  @change="debouncedPreview"
                />
                透明背景
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 预览和下载区域 -->
      <div class="preview-section">
        <h3>预览结果</h3>
        
        <!-- 加载状态 -->
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
          <p>正在生成图片...</p>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error">
          <p>{{ error }}</p>
        </div>

        <!-- 预览图片 -->
        <div v-else-if="imageUrl" class="preview-container">
          <img :src="imageUrl" alt="Generated formula" class="preview-image" />
          <div class="preview-actions">
            <button @click="downloadImage" class="btn btn-primary">
              📥 下载 PNG
            </button>
            <button @click="copyImageUrl" class="btn btn-secondary">
              📋 复制图片链接
            </button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <p>👆 请在上方输入公式以开始转换</p>
        </div>
      </div>
    </div>

    <!-- 示例公式 -->
    <div class="examples-section">
      <h3>示例公式</h3>
      <div class="examples-grid">
        <button
          v-for="example in examples"
          :key="example.name"
          @click="useExample(example.formula)"
          class="example-btn"
        >
          <span class="example-name">{{ example.name }}</span>
          <code class="example-code">{{ example.formula }}</code>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'FormulaConverter',
  data() {
    return {
      formula: '',
      imageUrl: '',
      loading: false,
      error: '',
      debounceTimer: null,
      params: {
        displayMode: 'false',
        fontSize: 32,
        color: '#000000',
        bgColor: '#ffffff',
        transparent: false
      },
      examples: [
        { name: '质能方程', formula: 'E=mc^2' },
        { name: '分数', formula: '\\frac{a}{b}' },
        { name: '求和', formula: '\\sum_{i=1}^{n} x_i' },
        { name: '积分', formula: '\\int_{0}^{\\infty} e^{-x^2} dx' },
        { name: '矩阵', formula: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
        { name: '平方根', formula: '\\sqrt{x^2 + y^2}' }
      ]
    }
  },
  methods: {
    debouncedPreview() {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(this.generatePreview, 500)
    },

    async generatePreview() {
      if (!this.formula.trim()) {
        this.imageUrl = ''
        return
      }

      this.loading = true
      this.error = ''

      try {
        const params = new URLSearchParams({
          tex: this.formula,
          displayMode: this.params.displayMode,
          fontSize: `${this.params.fontSize}px`,
          color: this.params.color
        })

        if (!this.params.transparent) {
          params.append('bg', this.params.bgColor)
        } else {
          params.append('bg', 'transparent')
        }

        // 生成图片 URL（开发环境用代理，生产环境直接调用）
        this.imageUrl = `/api/latex?${params.toString()}`
        
      } catch (err) {
        this.error = '生成图片失败: ' + (err.response?.data || err.message)
      } finally {
        this.loading = false
      }
    },

    useExample(formula) {
      this.formula = formula
      this.debouncedPreview()
    },

    downloadImage() {
      if (this.imageUrl) {
        const link = document.createElement('a')
        link.href = this.imageUrl
        link.download = `formula-${Date.now()}.png`
        link.click()
      }
    },

    async copyImageUrl() {
      try {
        const fullUrl = window.location.origin + this.imageUrl
        await navigator.clipboard.writeText(fullUrl)
        alert('图片链接已复制到剪贴板')
      } catch (err) {
        console.error('复制失败:', err)
      }
    }
  },

  mounted() {
    // 默认示例
    this.formula = 'E=mc^2'
    this.generatePreview()
  }
}
</script>

<style scoped>
.formula-converter {
  max-width: 1000px;
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

.formula-input {
  width: 100%;
  height: 120px;
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  resize: vertical;
  transition: border-color 0.3s ease;
}

.formula-input:focus {
  outline: none;
  border-color: #667eea;
}

/* 参数设置样式 */
.params-section h3 {
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
  min-width: 80px;
}

.param-group select,
.param-group input[type="color"] {
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.param-group input[type="range"] {
  flex: 1;
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

.error {
  color: #e74c3c;
  text-align: center;
  padding: 1rem;
  background: #fdf2f2;
  border-radius: 6px;
}

.preview-container {
  text-align: center;
}

.preview-image {
  max-width: 100%;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.preview-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

.example-code {
  display: block;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #666;
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
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
}
</style>