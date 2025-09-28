#!/bin/bash

# KaTeX to PNG Converter 开发环境启动脚本

echo "🚀 启动 KaTeX to PNG Converter 开发环境..."

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js (>= 18.0.0)"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，请升级到 18.0.0 以上"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $(node --version)"

# 安装依赖
echo "📦 检查并安装项目依赖..."

if [ ! -d "node_modules" ]; then
    echo "📦 安装根项目依赖..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd frontend && npm install && cd ..
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 安装后端依赖..."
    cd backend && npm install && cd ..
fi

echo "✅ 依赖安装完成"

# 启动服务
echo "🌟 启动开发服务器..."
echo ""
echo "📍 服务地址:"
echo "   前端应用: http://localhost:5173"
echo "   后端API:  http://localhost:3001"
echo ""
echo "🔗 API测试示例:"
echo "   http://localhost:3001/latex?tex=E=mc^2"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 使用并行方式启动前端和后端
npm run dev &
npm run dev:backend &

# 等待用户中断
wait