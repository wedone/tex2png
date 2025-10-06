import { TexToImage } from './tex-to-image.js';

export class MixedContentProcessor {
  constructor() {
    this.imageCache = new Map(); // 缓存生成的图片
  }

  // 完全参考 org splitTextWithMath 的实现
  splitTextWithMath(input) {
    // 先规范化：将可能的双反斜杠定界符转为单反斜杠，避免多层转义导致无法匹配
    const normalized = String(input)
      .replace(/\\\(/g, '\\(')
      .replace(/\\\)/g, '\\)')
      .replace(/\\\[/g, '\\[')
      .replace(/\\\]/g, '\\]');

    // 全面支持 $...$、$$...$$、\(...\)、\[...\]，不受转义影响
    const result = [];
    // 顺序：$$...$$、\[...\]、$...$、\(...\)
    const regex = /(\$\$([\s\S]+?)\$\$)|(\\\[([\s\S]+?)\\\])|(\$([\s\S]+?)\$)|(\\\(([\s\S]+?)\\\))/g;
    // 说明：
    //  - $$...$$    -> 分组1/2
    //  - \[...\]   -> 分组3/4（单反斜杠）
    //  - $...$      -> 分组5/6
    //  - \(...\)   -> 分组7/8（单反斜杠）
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(normalized)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', content: normalized.slice(lastIndex, match.index) });
      }
      if (match[1]) { // $$...$$
        result.push({ type: 'block', content: match[2] });
      } else if (match[3]) { // \[...\]
        result.push({ type: 'block', content: match[4] });
      } else if (match[5]) { // $...$
        result.push({ type: 'inline', content: match[6] });
      } else if (match[7]) { // \(...\)
        result.push({ type: 'inline', content: match[8] });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < normalized.length) {
      result.push({ type: 'text', content: normalized.slice(lastIndex) });
    }
    return result;
  }

  // 处理混合内容，完全参考 org 的逻辑
  async processContent(text, options = {}) {
    if (!text.trim()) return { html: '', formulas: [] };

    try {
      const parts = this.splitTextWithMath(text);
      let processedHtml = '';
      const processedFormulas = [];
      let formulaCount = 0;

      for (const part of parts) {
        if (part.type === 'text') {
          // 普通文本，转义HTML并处理换行
          processedHtml += this.escapeHtml(part.content).replace(/\n/g, '<br>');
        } else if (part.type === 'inline' || part.type === 'block') {
          // 公式部分，生成图片
          const imageResult = await this.generateFormulaImage({
            id: `formula_${formulaCount}`,
            latex: part.content,
            type: part.type
          }, options);
          
          processedFormulas.push({
            id: `formula_${formulaCount}`,
            latex: part.content,
            type: part.type,
            imageUrl: imageResult.url,
            imageSize: imageResult.size
          });

          const imgClass = part.type === 'block' ? 'formula-display' : 'formula-inline';
          processedHtml += `<img src="${imageResult.url}" alt="${this.escapeHtml(part.content)}" class="${imgClass}" data-formula-id="formula_${formulaCount}" />`;
          formulaCount++;
        }
      }

      return {
        html: processedHtml,
        formulas: processedFormulas
      };

    } catch (error) {
      console.error('处理混合内容失败:', error);
      throw error;
    }
  }

  // 生成单个公式图片
  async generateFormulaImage(formula, options) {
    const cacheKey = `${formula.latex}_${JSON.stringify(options)}_${formula.type}`;
    
    // 检查缓存
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }

    // 根据公式类型调整选项
    const formulaOptions = {
      ...options,
      displayMode: formula.type === 'block', // block = display, inline = inline
      fontSize: formula.type === 'block' ? (options.fontSize || 20) : (options.fontSize || 16)
    };

    // 生成图片
    const result = await TexToImage.convertToImageUrl(formula.latex, formulaOptions);
    
    // 缓存结果
    this.imageCache.set(cacheKey, result);
    
    return result;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 清理缓存
  clearCache() {
    this.imageCache.forEach(result => {
      if (result.revoke) result.revoke();
    });
    this.imageCache.clear();
  }

  destroy() {
    this.clearCache();
  }
}