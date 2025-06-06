# 更新日志

自动生成的版本历史记录。


### [1.1.2](https://github.com/wuding129/gitgrove/compare/v1.1.1...v1.1.2) (2025-06-06)


### 🔧 构建/工程依赖/工具

* 调整versionrc ([08d1263](https://github.com/wuding129/gitgrove/commit/08d1263cea0dc12f3b4da8678a3daef06d1a60bf))


### 🐛 问题修复

* gg -v 版本号不对 ([61dcf51](https://github.com/wuding129/gitgrove/commit/61dcf5191efdf70b21ff812e575078d53719a7b5))
* 修复release commit message ([4cc9189](https://github.com/wuding129/gitgrove/commit/4cc9189ac5569d7d17839e73e957173ec1027111))

### [1.1.1](https://github.com/wuding129/gitgrove/compare/v1.1.0...v1.1.1) (2025-06-06)

## 1.1.0 (2025-06-06)


### ✨ 新功能

* 初始化核心功能 ([ade4123](https://github.com/wuding129/gitgrove/commit/ade41234d643abc7faf4deed6c1382a23d90859b))

## [1.0.0] - 2024-06-06

### ✨ 新功能

- 🎉 初始版本发布
- ✅ 完全中文化的Git工作流初始化工具
- ✅ 支持npm/pnpm/yarn包管理器自动检测
- ✅ 无字符长度限制的提交信息
- ✅ 智能分支命名规范验证
- ✅ 主分支保护机制
- ✅ 基于lefthook的Git hooks管理
- ✅ 自动化版本发布和CHANGELOG生成
- ✅ 提供check命令检查配置状态
- ✅ 提供fix命令修复hooks冲突
- ✅ 完整的辅助脚本生成
- ✅ 友好的交互式命令行界面

### 🔧 配置文件

- 创建commitlint.config.js（支持中文，无字符限制）
- 创建.cz-config.js（中文化交互界面）
- 创建lefthook.yml（分支和提交验证）
- 创建.versionrc.js（中文CHANGELOG配置）

### 📜 npm脚本

- commit - 交互式规范提交
- branch - 交互式分支创建
- release - 自动版本发布
- git:setup - Git hooks配置
- git:fix - hooks冲突修复

### 🛠️ 辅助脚本

- scripts/create-branch.sh - 分支创建脚本
- scripts/setup.sh - 快速初始化脚本
- scripts/fix-hooks-conflict.sh - hooks修复脚本
