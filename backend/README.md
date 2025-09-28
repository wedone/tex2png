# tex2png-backend

这是一个基于 Node.js + Express + KaTeX + Puppeteer 的 API 服务，可以将 LaTeX/KaTeX 公式渲染为 PNG 图片。

## 使用方法

1. 安装依赖

```bash
cd backend
npm install
```

2. 启动服务

```bash
npm start
```

3. 访问 API

- 公式转图片：
  - `http://localhost:3001/latex?tex=E=mc^2`
  - 可选参数：`displayMode`、`color`、`bg`、`fontSize`
  - 例：`http://localhost:3001/latex?tex=\\frac{a}{b}&displayMode=true&color=red&bg=white&fontSize=48px`

## 依赖
- express
- puppeteer
- katex

## 说明
- 适合部署到 Vercel/Heroku 或本地运行
- 仅支持 PNG 输出
