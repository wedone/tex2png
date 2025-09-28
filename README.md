# KaTeX to PNG Converter

一个现代化的 KaTeX 数学公式转 PNG 图片的 Web 应用，支持单公式转换和混合文本转换功能。

## 🌟 功能特性

### 公式转换器
- 🔤 支持完整的 LaTeX/KaTeX 语法
- 🎨 可自定义字体大小、颜色、背景
- 📱 实时预览和参数调节
- 💾 一键下载 PNG 图片
- 🔗 支持直接 URL 访问图片

### 混合文本转换器
- 📝 支持文本和公式混合内容
- 🔍 自动识别 `$公式$` 和 `$$公式$$` 语法
- 🖼️ 实时渲染预览
- 📤 多种导出格式（HTML、Markdown）

## 🚀 在线访问

- **演示地址**: [https://your-app.vercel.app](https://your-app.vercel.app)
- **API 接口**: `https://your-app.vercel.app/api/latex?tex=E=mc^2`

## 📖 API 使用方法

### 直接 URL 访问

```
https://your-app.vercel.app/api/latex?tex=E=mc^2
https://your-app.vercel.app/api/latex?tex=\frac{a}{b}&displayMode=true&color=blue&fontSize=48px
```

### 参数说明

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `tex` | LaTeX 公式（必需） | - | `E=mc^2` |
| `displayMode` | 显示模式 | `false` | `true`/`false` |
| `fontSize` | 字体大小 | `32px` | `24px` |
| `color` | 文字颜色 | `#000000` | `red`/`#ff0000` |
| `bg` | 背景颜色 | `transparent` | `white`/`#ffffff` |
| `engine` | 渲染引擎（可选） | `auto` | `mathjax`/`puppeteer` |

说明：
- 默认（`engine=auto`）：若检测到无头浏览器依赖缺失，会直接使用 MathJax（SVG）+ Sharp；否则尝试 Puppeteer + KaTeX。
- `engine=mathjax`：强制无浏览器渲染（最兼容、冷启动快）。
- `engine=puppeteer`：强制使用 Puppeteer + KaTeX（如依赖缺失则会报错）。

## 🛠️ 本地开发

### 环境要求
- Node.js >= 18.0.0
- npm 或 yarn

### 安装依赖
```bash
npm run install:all
```

### 启动开发服务器
```bash
# 启动前端开发服务器
npm run dev

# 启动后端 API 服务器（可选，用于本地 API 测试）
npm run dev:backend
```

### 构建项目
```bash
npm run build
```

## 📁 项目结构

```
tex2png/
├── frontend/              # Vue.js 前端应用
│   ├── src/
│   │   ├── App.vue       # 主应用组件
│   │   ├── main.js       # 应用入口
│   │   └── components/   # 组件目录
│   │       ├── FormulaConverter.vue      # 公式转换器
│   │       └── MixedTextConverter.vue    # 混合文本转换器
│   ├── package.json
│   └── vite.config.js    # Vite 构建配置
├── api/                  # Vercel API 路由
│   └── latex.js          # 公式渲染 API
├── backend/              # 备用的 Express 后端（可选）
├── vercel.json           # Vercel 部署配置
├── package.json          # 根项目配置
└── README.md
```

## 🌐 部署到 Vercel

### 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/wedone/tex2png)

### 手动部署

1. 克隆仓库
```bash
git clone https://github.com/wedone/tex2png.git
cd tex2png
```

2. 安装 Vercel CLI
```bash
npm i -g vercel
```

3. 部署
```bash
vercel --prod
```

## 🔧 技术栈

- **前端**: Vue.js 3 + Vite + Vue Router
- **后端**: Node.js + Puppeteer + KaTeX
- **部署**: Vercel (Serverless Functions)
- **样式**: 原生 CSS3 (响应式设计)

## 📋 使用示例

### 基础公式
- `E=mc^2` - 质能方程
- `\frac{a}{b}` - 分数
- `\sum_{i=1}^{n} x_i` - 求和
- `\int_{0}^{\infty} e^{-x^2} dx` - 积分

### 混合文本示例
```
这是普通文本，包含行内公式 $E=mc^2$，还有块级公式：

$$\frac{d}{dx}\int_{a}^{x} f(t)dt = f(x)$$

这样就可以在文档中自然地混合文本和数学公式。
```

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源。详情请见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [KaTeX](https://katex.org/) - 快速的数学公式渲染库
- [Puppeteer](https://puppeteer.sh/) - 无头浏览器自动化工具  
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vercel](https://vercel.com/) - 现代化的部署平台