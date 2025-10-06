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
          <div class="convert-panel" style="display: flex; align-items: center; gap: 16px; margin-bottom: 10px;">
            <label style="margin:0;"><input type="checkbox" id="auto-convert" checked> 自动转换</label>
            <div id="convert-btn-group" style="display:none;">
              <button id="manual-convert" type="button">转换</button>
            </div>
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
              <label>内边距: <span id="padding-value">1</span>px</label>
              <input type="range" id="padding" min="0" max="20" value="1">
            </div>
            <div class="option-group">
              <label>图片缩放: <span id="scale-value">2</span>x</label>
              <input type="range" id="scale" min="1" max="4" value="2" step="0.5">
            </div>
            <!-- 自动转换和转换按钮已移至输入框上方 -->
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
    const autoConvert = document.getElementById('auto-convert');
    const convertBtnGroup = document.getElementById('convert-btn-group');
    const manualConvert = document.getElementById('manual-convert');

    // 实时预览
    const updatePreview = this.debounce(() => this.updatePreview(), 800);

    // 事件绑定函数
    const bindAuto = () => {
      if (autoConvert.checked) {
        input.addEventListener('input', updatePreview);
        fontSize.addEventListener('input', sliderHandler);
        textColor.addEventListener('input', updatePreview);
        bgColor.addEventListener('input', updatePreview);
        transparentBg.addEventListener('change', updatePreview);
        padding.addEventListener('input', sliderHandler);
        scale.addEventListener('input', sliderHandler);
        convertBtnGroup.style.display = 'none';
      } else {
        input.removeEventListener('input', updatePreview);
        fontSize.removeEventListener('input', sliderHandler);
        textColor.removeEventListener('input', updatePreview);
        bgColor.removeEventListener('input', updatePreview);
        transparentBg.removeEventListener('change', updatePreview);
        padding.removeEventListener('input', sliderHandler);
        scale.removeEventListener('input', sliderHandler);
        convertBtnGroup.style.display = '';
      }
    };

    // sliderHandler 用于 slider 变化时刷新数值和预览
    const sliderHandler = () => {
      this.updateSliderValues();
      updatePreview();
    };

    // 初始绑定
    bindAuto();

    // 自动转换勾选切换
    autoConvert.addEventListener('change', () => {
      bindAuto();
    });

    // 手动转换按钮
    manualConvert.addEventListener('click', () => {
      this.updateSliderValues();
      this.updatePreview();
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
        // 内容插入后，按图片 natural size 缩放（按原图像素的50%显示）
        this.postProcessPreviewImages(0.5);
        
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

  // post-process: 将预览内的公式图片按原始像素尺寸等比缩放
  postProcessPreviewImages(scale = 0.5) {
    const preview = document.getElementById('preview-content');
    if (!preview) return;
    // 查找所有 formula 图像（包含 inline 和 display）
    const imgs = preview.querySelectorAll('img.formula-inline, img.formula-display');
    imgs.forEach(img => {
      // 清除 CSS transform 影响，确保使用 inline width 控制布局
      img.style.transform = '';
      // 如果图片已经加载，直接按 naturalWidth 缩放
      const apply = () => {
        try {
          const nw = img.naturalWidth || img.width;
          if (nw && !isNaN(nw) && nw > 0) {
            img.style.width = Math.round(nw * scale) + 'px';
            img.style.height = 'auto';
          }
        } catch (e) {
          // ignore
        }
      };
      if (img.complete) {
        apply();
      } else {
        img.addEventListener('load', apply, { once: true });
      }
    });
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