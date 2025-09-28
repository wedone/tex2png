# 🚀 Vercel 部署指南

## 📋 部署前检查清单

✅ 代码已推送到 GitHub: `https://github.com/wedone/tex2png`  
✅ 项目结构已优化  
✅ Vercel 配置文件已创建  
✅ 依赖配置已完善  

## 🌐 方法一：网页一键部署（推荐，最简单）

### 步骤 1：访问 Vercel
1. 打开浏览器访问：**[https://vercel.com](https://vercel.com)**
2. 点击 **"Start Deploying"** 或 **"Sign Up"**
3. 选择 **"Continue with GitHub"** 使用 GitHub 账号登录

### 步骤 2：导入项目
1. 登录后，在 Vercel Dashboard 点击 **"New Project"**
2. 在 "Import Git Repository" 页面找到 **`wedone/tex2png`** 仓库
3. 点击 **"Import"** 按钮

### 步骤 3：配置部署设置
```
项目名称 (Project Name): tex2png
框架预设 (Framework Preset): Other
根目录 (Root Directory): ./
构建命令 (Build Command): npm run build  
输出目录 (Output Directory): frontend/dist
安装命令 (Install Command): npm install && cd frontend && npm install
```

### 步骤 4：部署
1. 点击 **"Deploy"** 按钮
2. 等待部署完成（约 2-3 分钟）
3. 部署成功后会获得类似 `https://tex2png-xxx.vercel.app` 的网址

## 🔗 一键部署链接

点击下面的按钮即可直接部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/wedone/tex2png)

## 📱 方法二：命令行部署

如果您熟悉命令行操作：

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录 Vercel
vercel login
# 按提示完成网页授权

# 3. 部署到生产环境
vercel --prod
```

## ✅ 部署成功后的测试

部署完成后，您应该能够：

### 🌟 访问前端界面
```
https://your-app.vercel.app/           # 公式转换器
https://your-app.vercel.app/mixed     # 混合文本转换器
```

### 🔗 测试 API 接口
```
https://your-app.vercel.app/api/latex?tex=E=mc^2
https://your-app.vercel.app/api/latex?tex=\frac{a}{b}&displayMode=true&color=red
```

## 🔧 常见问题解决

### 问题1：构建失败
**解决方案：**
- 检查 `vercel.json` 配置是否正确
- 确保 `package.json` 中的脚本命令正确
- 查看 Vercel 控制台的构建日志

### 问题2：API 不工作  
**解决方案：**
- 检查 `api/latex.js` 文件是否存在
- 确保 Puppeteer 依赖正确安装
- 查看 Vercel Functions 日志

### 问题3：前端页面空白
**解决方案：**
- 检查 `frontend/dist` 目录是否生成
- 确保 Vite 构建成功
- 检查路由配置是否正确

## 🎯 部署后的功能特性

✅ **公式转换器**
- 实时公式预览
- 参数自定义（颜色、大小等）
- 一键下载 PNG
- 示例公式库

✅ **混合文本转换器**  
- 智能文本解析
- 混合内容渲染
- 多格式导出

✅ **API 服务**
- 直接 URL 访问返回图片
- 完整参数支持
- 全球 CDN 加速

## 📊 性能优化

Vercel 部署自动包含：
- 🌍 全球 CDN 分发
- ⚡ 自动缓存优化  
- 🔄 自动 HTTPS
- 📈 性能监控
- 🚀 无服务器函数

## 🎉 恭喜！

您的 KaTeX to PNG 转换器现在已经：
- ✅ 托管在 GitHub 上
- ✅ 部署到 Vercel 云端  
- ✅ 拥有全球访问地址
- ✅ 支持自动更新（推送代码即自动部署）

下次修改代码后，只需 `git push`，Vercel 会自动重新部署！