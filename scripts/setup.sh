#!/bin/bash

# 团队成员快速初始化脚本
# 用于新团队成员快速配置Git工作流环境

set -e

echo "🚀 Git工作流快速初始化"
echo "======================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查是否已配置Git工作流
if [ ! -f "lefthook.yml" ] || [ ! -f "commitlint.config.js" ]; then
    echo -e "${RED}❌ 错误: 项目未配置Git工作流${NC}"
    echo -e "${YELLOW}请先运行: gitgrove${NC}"
    exit 1
fi

echo -e "${BLUE}📦 安装项目依赖...${NC}"

# 检测包管理工具并安装依赖
if [ -f "pnpm-lock.yaml" ]; then
    echo -e "${GREEN}检测到pnpm配置，使用pnpm安装...${NC}"
    pnpm install
    MANAGER="pnpm"
elif [ -f "yarn.lock" ]; then
    echo -e "${GREEN}检测到yarn配置，使用yarn安装...${NC}"
    yarn install
    MANAGER="yarn"
else
    echo -e "${GREEN}使用npm安装...${NC}"
    npm install
    MANAGER="npm"
fi

echo -e "${BLUE}🔧 初始化Git hooks...${NC}"

# 初始化lefthook
if command -v lefthook &> /dev/null; then
    lefthook install
    echo -e "${GREEN}✅ Git hooks初始化完成${NC}"
else
    echo -e "${YELLOW}⚠️  lefthook未找到，尝试通过${MANAGER}安装...${NC}"
    if [ "$MANAGER" = "npm" ]; then
        npm run prepare
    elif [ "$MANAGER" = "pnpm" ]; then
        pnpm run prepare
    elif [ "$MANAGER" = "yarn" ]; then
        yarn run prepare
    fi
fi

echo ""
echo -e "${GREEN}🎉 Git工作流初始化完成！${NC}"
echo ""
echo -e "${BLUE}📚 常用命令 (${MANAGER}):${NC}"
echo "  📝 提交代码: ${MANAGER} run commit"
echo "  🌿 创建分支: ${MANAGER} run branch"
echo "  🚀 发布版本: ${MANAGER} run release"
echo "  ❓ 显示帮助: ${MANAGER} run help:git"
echo ""
echo -e "${GREEN}开始愉快的开发吧！ 🚀${NC}"