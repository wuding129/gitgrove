#!/bin/bash

# Git hooks冲突修复脚本
# 用于修复已有项目中的Git hooks冲突问题

set -e

echo "🔧 Git Hooks冲突修复脚本"
echo "========================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查是否在Git仓库中
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ 错误: 不在Git仓库中${NC}"
    exit 1
fi

echo -e "${BLUE}🧹 清理冲突的Git hooks...${NC}"

# 备份现有hooks
if [ -d ".git/hooks" ] && [ "$(ls -A .git/hooks 2>/dev/null)" ]; then
    backup_dir=".git/hooks-backup-$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}📦 备份现有hooks到: ${backup_dir}${NC}"
    mkdir -p "$backup_dir"
    cp -r .git/hooks/* "$backup_dir/" 2>/dev/null || true
fi

# 清理可能冲突的hooks文件
echo -e "${YELLOW}🗑️  清理冲突文件...${NC}"
rm -f .git/hooks/pre-commit.old
rm -f .git/hooks/commit-msg.old
rm -f .git/hooks/pre-push.old
rm -f .git/hooks/pre-commit.sample
rm -f .git/hooks/commit-msg.sample
rm -f .git/hooks/pre-push.sample

# 清理husky相关文件
if [ -d ".husky" ]; then
    echo -e "${YELLOW}🗑️  清理旧的husky配置...${NC}"
    rm -rf .husky
fi

# 重新安装lefthook
echo -e "${BLUE}🚀 重新安装lefthook hooks...${NC}"

# 检测包管理工具
if [ -f "pnpm-lock.yaml" ]; then
    MANAGER="pnpm"
elif [ -f "yarn.lock" ]; then
    MANAGER="yarn"
else
    MANAGER="npm"
fi

# 尝试不同方式安装lefthook
if command -v lefthook &> /dev/null; then
    echo -e "${GREEN}使用全局lefthook安装...${NC}"
    lefthook install
elif command -v npx &> /dev/null; then
    echo -e "${GREEN}使用npx lefthook安装...${NC}"
    npx lefthook install
else
    echo -e "${YELLOW}使用${MANAGER}脚本安装...${NC}"
    if [ "$MANAGER" = "npm" ]; then
        npm run git:setup
    elif [ "$MANAGER" = "pnpm" ]; then
        pnpm run git:setup
    elif [ "$MANAGER" = "yarn" ]; then
        yarn run git:setup
    fi
fi

# 验证安装结果
if [ -f ".git/hooks/pre-commit" ] && [ -f ".git/hooks/commit-msg" ]; then
    echo -e "${GREEN}✅ Lefthook hooks安装成功${NC}"
    echo ""
    echo -e "${BLUE}📋 已安装的hooks:${NC}"
    ls -la .git/hooks/ | grep -E "(pre-commit|commit-msg|pre-push)" | sed 's/^/  /' || echo "  检测到hooks文件"
else
    echo -e "${YELLOW}⚠️  Lefthook hooks可能未完全安装${NC}"
    echo -e "${BLUE}💡 建议手动运行:${NC}"
    echo "  ${MANAGER} run git:setup"
    echo "  或检查lefthook.yml配置文件"
fi

echo ""
echo -e "${GREEN}🎉 Git hooks冲突修复完成！${NC}"
echo ""
echo -e "${BLUE}📝 下一步:${NC}"
echo "1. 测试提交: ${MANAGER} run test:commit"
echo "2. 正常使用: ${MANAGER} run commit"
echo "3. 创建分支: ${MANAGER} run branch"
echo ""
echo -e "${YELLOW}💾 原hooks已备份到: ${backup_dir:-无备份}${NC}"