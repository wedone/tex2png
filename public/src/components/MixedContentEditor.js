import { MixedContentProcessor } from '../utils/mixed-content-processor.js';

export class MixedContentEditor {
  constructor(container) {
    this.container = container;
    this.processor = new MixedContentProcessor();
    this.setupUI();
  }

  setupUI() {
    this.container.innerHTML = `
      <div class="editor-layout">
        <div class="input-panel">
          <div class="input-header">
            <h3>📝 输入区域</h3>
            <small>支持普通文本 + LaTeX 公式混合输入</small>
          </div>
          <textarea id="mixed-input" placeholder="请输入内容，例如：

这是普通文本。

行内公式：爱因斯坦质能方程 $E = mc^2$ 很有名。

块级公式：
$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

化学公式：水的分子式是 \\ce{H2O}。

更多文本内容..."></textarea>

          <div class="options-panel">
            <div class="option-group">
              <label>字体大小: <span id="font-size-value">18</span>px</label>
              <input type="range" id="font-size" min="12" max="36" value="18">
            </div>
            <div class="option-group">
              <label>文字颜色:</label>
              <input type="color" id="text-color" value="#1f2328">
            </div>
            <div class="option-group">
              <label>背景颜色:</label>
              <input type="color" id="bg-color" value="#ffffff">
            </div>
            <div class="option-group">
              <label><input type="checkbox" id="transparent-bg" checked> 透明背景</label>
            </div>
            <div class="option-group">
              <label>内边距: <span id="padding-value">4</span>px</label>
              <input type="range" id="padding" min="0" max="20" value="4">
            </div>
            <div class="option-group">
              <label>图片缩放: <span id="scale-value">2</span>x</label>
              <input type="range" id="scale" min="1" max="4" value="2" step="0.5">
            </div>
          </div>
        </div>

        <div class="preview-panel">
          <div class="preview-header">
            <h3>🖼️ 预览区域</h3>
            <small>普通文本 + LaTeX 公式图片</small>
          </div>
          <div id="preview-content">
            <div class="placeholder">在左侧输入混合内容开始预览</div>
          </div>
          <div id="formula-stats"></div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateSliderValues();
  }

  bindEvents() {
    const input = document.getElementById('mixed-input');
    const fontSize = document.getElementById('font-size');
    const textColor = document.getElementById('text-color');
    const bgColor = document.getElementById('bg-color');
    const transparentBg = document.getElementById('transparent-bg');
    const padding = document.getElementById('padding');
    const scale = document.getElementById('scale');

    // 实时预览
    const updatePreview = this.debounce(() => this.updatePreview(), 800);

    input.addEventListener('input', updatePreview);
    fontSize.addEventListener('input', () => {
      this.updateSliderValues();
      updatePreview();
    });
    textColor.addEventListener('input', updatePreview);
    bgColor.addEventListener('input', updatePreview);
    transparentBg.addEventListener('change', updatePreview);
    padding.addEventListener('input', () => {
      this.updateSliderValues();
      updatePreview();
    });
    scale.addEventListener('input', () => {
      this.updateSliderValues();
      updatePreview();
    });
  }

  updateSliderValues() {
    document.getElementById('font-size-value').textContent = 
      document.getElementById('font-size').value;
    document.getElementById('padding-value').textContent = 
      document.getElementById('padding').value;
    document.getElementById('scale-value').textContent = 
      document.getElementById('scale').value;
  }

  async updatePreview() {
    const text = document.getElementById('mixed-input').value;
    const previewContent = document.getElementById('preview-content');
    const formulaStats = document.getElementById('formula-stats');

    if (!text.trim()) {
      previewContent.innerHTML = '<div class="placeholder">在左侧输入混合内容开始预览</div>';
      formulaStats.innerHTML = '';
      return;
    }

    try {
      previewContent.innerHTML = '<div class="loading">⏳ 正在处理内容和生成公式图片...</div>';
      formulaStats.innerHTML = '';

      const options = this.getOptions();
      const result = await this.processor.processContent(text, options);

      if (result.formulas.length === 0) {
        // 纯文本内容
        previewContent.innerHTML = `
          <div class="text-content">
            ${this.escapeHtml(text).replace(/\n/g, '<br>')}
          </div>
        `;
        formulaStats.innerHTML = '<div class="stats">📄 纯文本内容，未检测到 LaTeX 公式</div>';
      } else {
        // 混合内容
        previewContent.innerHTML = `
          <div class="mixed-content">
            ${result.html}
          </div>
        `;
        
        const totalSize = result.formulas.reduce((sum, f) => sum + f.imageSize, 0);
        formulaStats.innerHTML = `
          <div class="stats">
            📊 检测到 ${result.formulas.length} 个公式，
            总图片大小: ${(totalSize / 1024).toFixed(1)} KB
          </div>
        `;
      }

    } catch (error) {
      previewContent.innerHTML = `
        <div class="error">❌ 处理失败: ${error.message}</div>
      `;
      formulaStats.innerHTML = '';
    }
  }

  getOptions() {
    const transparentBg = document.getElementById('transparent-bg').checked;
    const bgColor = document.getElementById('bg-color').value;

    return {
      fontSize: parseInt(document.getElementById('font-size').value),
      color: document.getElementById('text-color').value,
      background: transparentBg ? 'transparent' : bgColor,
      padding: parseInt(document.getElementById('padding').value),
      scale: parseFloat(document.getElementById('scale').value)
    };
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  destroy() {
    this.processor.destroy();
  }
}