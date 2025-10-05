import katex from 'katex';
import html2canvas from 'html2canvas';

export class TexToImage {
  static async convertToImageUrl(latex, options = {}) {
    // 1. 渲染为 Canvas
    const canvas = await this.renderToCanvas(latex, options);
    
    // 2. 转换为 Blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });
    
    // 3. 创建图片 URL
    const imageUrl = URL.createObjectURL(blob);
    
    return {
      url: imageUrl,
      size: blob.size,
      type: blob.type,
      revoke: () => URL.revokeObjectURL(imageUrl)
    };
  }
  
  static async renderToCanvas(latex, options = {}) {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: options.displayMode || false,
      strict: 'ignore',
      trust: true
    });
    
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.fontSize = `${options.fontSize || 20}px`;
    container.style.color = options.color || '#000';
    container.style.background = options.background || 'transparent';
    container.style.padding = `${options.padding || 4}px`;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.fontFamily = 'KaTeX_Main, "Times New Roman", serif';
    
    // 添加到页面进行渲染
    document.body.appendChild(container);
    
    try {
      const canvas = await html2canvas(container, {
        backgroundColor: options.background === 'transparent' ? null : options.background,
        scale: options.scale || 2,
        useCORS: true,
        allowTaint: true
      });
      
      return canvas;
    } finally {
      // 确保清理 DOM
      document.body.removeChild(container);
    }
  }
}