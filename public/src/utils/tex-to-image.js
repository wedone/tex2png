export class TexToImage {
  static async convertToImageUrl(latex, options = {}) {
    // 如果启用了 serverRender，直接返回 server API 的 URL（无需在前端生成 blob）
    if (options.serverRender) {
      // encode params minimally
      const params = new URLSearchParams();
      params.set('latex', latex);
      if (options.displayMode) params.set('display', '1');
      if (options.fontSize) params.set('fontSize', String(options.fontSize));
      if (options.padding !== undefined) params.set('padding', String(options.padding));
      // 返回服务器可直接访问的图片 URL
      const url = `/api/render?${params.toString()}`;
      return { url, size: 0, type: 'image/png', revoke: () => {} };
    }

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
    if (!window.katex) {
      throw new Error('KaTeX not loaded');
    }
    const html = window.katex.renderToString(latex, {
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
    container.style.padding = `${options.padding !== undefined ? options.padding : 4}px`;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.fontFamily = 'KaTeX_Main, "Times New Roman", serif';
    container.style.lineHeight = '0';
    container.style.display = 'inline-block';
    
    // 清除 KaTeX 的默认边距
    const style = document.createElement('style');
    style.textContent = `
      .katex-display { margin: 0 !important; }
      .katex { margin: 0 !important; }
    `;
    document.head.appendChild(style);
    
    // 添加到页面进行渲染
    document.body.appendChild(container);
    
    try {
      if (!window.html2canvas) {
        throw new Error('html2canvas not loaded');
      }
      const canvas = await window.html2canvas(container, {
        backgroundColor: options.background === 'transparent' ? null : options.background,
        scale: options.scale || 2,
        useCORS: true,
        allowTaint: true
      });
      
      return canvas;
    } finally {
      // 确保清理 DOM
      document.body.removeChild(container);
      document.head.removeChild(style);
    }
  }
}