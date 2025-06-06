#!/bin/bash

# 交互式分支创建脚本
# 支持feature/hotfix/bugfix三种类型

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌿 创建规范化分支${NC}"
echo "===================="

# 选择分支类型
echo "请选择分支类型:"
echo "1) feature - 新功能开发"
echo "2) hotfix  - 紧急修复"
echo "3) bugfix  - 问题修复"
echo ""

read -p "请输入选择 (1-3): " choice

case $choice in
    1)
        branch_type="feature"
        echo -e "${GREEN}📝 创建功能分支${NC}"
        read -p "请输入模块名称 (如: user, payment): " module
        read -p "请输入功能描述 (如: login, checkout): " description
        branch_name="feature_${module}_${description}"
        ;;
    2)
        branch_type="hotfix"
        echo -e "${RED}🔥 创建热修复分支${NC}"
        read -p "请输入版本号 (如: 1.0.3): " version
        read -p "请输入修复描述 (如: login_fix): " description
        branch_name="hotfix_v${version}_${description}"
        ;;
    3)
        branch_type="bugfix"
        echo -e "${YELLOW}🐛 创建问题修复分支${NC}"
        read -p "请输入问题描述 (如: scroll_error): " description
        branch_name="bugfix_${description}"
        ;;
    *)
        echo -e "${RED}❌ 无效选择${NC}"
        exit 1
        ;;
esac

# 检查分支名称格式
if [[ ! $branch_name =~ ^[a-z_0-9.]+$ ]]; then
    echo -e "${RED}❌ 分支名称只能包含小写字母、数字、下划线和点${NC}"
    exit 1
fi

# 创建并切换到新分支
echo ""
echo -e "${BLUE}🚀 创建分支: ${branch_name}${NC}"

if git checkout -b "$branch_name"; then
    echo -e "${GREEN}✅ 分支创建成功！${NC}"
    echo ""
    echo -e "${BLUE}📝 下一步:${NC}"
    echo "1. 开始开发你的功能"
    
    # 检测包管理工具
    if [ -f "pnpm-lock.yaml" ]; then
        MANAGER="pnpm"
    elif [ -f "yarn.lock" ]; then
        MANAGER="yarn"
    else
        MANAGER="npm"
    fi
    
    echo "2. 使用 '$MANAGER run commit' 进行规范化提交"
    echo "3. 推送分支: git push -u origin $branch_name"
else
    echo -e "${RED}❌ 分支创建失败${NC}"
    exit 1
fi