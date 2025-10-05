import { TexToImage } from './tex-to-image.js';

export class MixedContentProcessor {
  constructor() {
    this.imageCache = new Map(); // 缓存生成的图片
  }

  // 参考 org 项目 splitTextWithMath，只分割四种主流定界符
  extractFormulas(text) {
    // 先规范化：将可能的双反斜杠定界符转为单反斜杠，避免多层转义导致无法匹配
    const normalized = String(text)
      .replace(/\\\(/g, '\\(')
      .replace(/\\\)/g, '\\)')
      .replace(/\\\[/g, '\\[')
      .replace(/\\\]/g, '\\]');

    const formulas = [];
    // 顺序：$$...$$、\[...\]、$...$、\(...\)
    const regex = /(\$\$([\s\S]+?)\$\$)|(\\\[([\s\S]+?)\\\])|(\$([\s\S]+?)\$)|(\\\(([\s\S]+?)\\\))/g;
    let match;
    while ((match = regex.exec(normalized)) !== null) {
      let formula;
      if (match[1]) {
        // $$...$$
        formula = {
          id: `formula_${formulas.length}`,
          full: match[1],
          latex: match[2],
          type: 'display',
          delim: '$$',
          start: match.index,
          end: match.index + match[1].length
        };
      } else if (match[3]) {
        // \[...\]
        formula = {
          id: `formula_${formulas.length}`,
          full: match[3],
          latex: match[4],
          type: 'display',
          delim: '\\[',
          start: match.index,
          end: match.index + match[3].length
        };
      } else if (match[5]) {
        // $...$
        formula = {
          id: `formula_${formulas.length}`,
          full: match[5],
          latex: match[6],
          type: 'inline',
          delim: '$',
          start: match.index,
          end: match.index + match[5].length
        };
      } else if (match[7]) {
        // \(...\)
        formula = {
          id: `formula_${formulas.length}`,
          full: match[7],
          latex: match[8],
          type: 'inline',
          delim: '\\(',
          start: match.index,
          end: match.index + match[7].length
        };
      }
      if (formula) {
        formulas.push(formula);
      }
    }
    return formulas.sort((a, b) => a.start - b.start);
  }

  // 处理混合内容，生成预览
  async processContent(text, options = {}) {
    if (!text.trim()) return { html: '', formulas: [] };

    // 参考 org splitTextWithMath
    const normalized = String(text)
      .replace(/\\\(/g, '\\(')
      .replace(/\\\)/g, '\\)')
      .replace(/\\\[/g, '\\[')
      .replace(/\\\]/g, '\\]');

    const regex = /(\$\$([\s\S]+?)\$\$)|(\\\[([\s\S]+?)\\\])|(\$([\s\S]+?)\$)|(\\\(([\s\S]+?)\\\))/g;
    let lastIndex = 0;
    let match;
    let processedHtml = '';
    const processedFormulas = [];
    let formulaCount = 0;

    while ((match = regex.exec(normalized)) !== null) {
      if (match.index > lastIndex) {
        // 普通文本片段，直接输出，KaTeX 会自动处理 \ce{...}
        processedHtml += this.escapeHtml(normalized.slice(lastIndex, match.index)).replace(/\n/g, '<br>');
      }
      let formulaType, formulaContent;
      if (match[1]) {
        formulaType = 'display'; formulaContent = match[2];
      } else if (match[3]) {
        formulaType = 'display'; formulaContent = match[4];
      } else if (match[5]) {
        formulaType = 'inline'; formulaContent = match[6];
      } else if (match[7]) {
        formulaType = 'inline'; formulaContent = match[8];
      }
      if (formulaType) {
        // 生成公式图片
        const imageResult = await this.generateFormulaImage({
          id: `formula_${formulaCount}`,
          latex: formulaContent,
          type: formulaType
        }, options);
        processedFormulas.push({
          id: `formula_${formulaCount}`,
          latex: formulaContent,
          type: formulaType,
          imageUrl: imageResult.url,
          imageSize: imageResult.size
        });
        const imgClass = formulaType === 'display' ? 'formula-display' : 'formula-inline';
        processedHtml += `<img src="${imageResult.url}" alt="${this.escapeHtml(formulaContent)}" class="${imgClass}" data-formula-id="formula_${formulaCount}" />`;
        formulaCount++;
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < normalized.length) {
      processedHtml += this.escapeHtml(normalized.slice(lastIndex)).replace(/\n/g, '<br>');
    }
    return {
      html: processedHtml,
      formulas: processedFormulas
    };
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
      displayMode: formula.type === 'display',
      fontSize: formula.type === 'display' ? (options.fontSize || 20) : (options.fontSize || 16)
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