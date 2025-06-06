# gitgrove

🌟 Git规范化工作流一键初始化工具

## 📖 简介

`gitgrove` 是一个命令行工具，可以在任意Node.js项目中一键初始化完整的Git规范化工作流。

## 🎯 设计初衷

在现代软件开发中，规范化的 Git 工作流对团队协作至关重要。然而，每次初始化新项目时都需要重复配置相同的工具链，这不仅耗时，还容易出现配置不一致的问题。`gitgrove` 的诞生就是为了解决这些痛点：

- **减少重复劳动** - 一键配置完整的 Git 工作流，无需每次手动设置
- **确保团队一致性** - 标准化的配置确保所有团队成员使用相同的工作流
- **降低学习成本** - 新团队成员可以快速上手规范化的开发流程
- **提高代码质量** - 通过规范化提交和分支管理，提升项目可维护性

## 🏗️ 设计原则

### 1. **项目级别配置，而非全局依赖**
虽然 `gitgrove` 本身是全局安装的工具，但所有的配置和依赖都安装在项目级别：
- **版本锁定** - 确保团队成员使用相同版本的工具
- **项目隔离** - 不同项目可以有不同的配置和工具版本
- **CI/CD 友好** - 持续集成环境可以直接从项目依赖获取工具

### 2. **中文化和本土化**
- **完全中文界面** - 提供友好的中文交互体验
- **无字符限制** - 支持任意长度的中文提交信息
- **符合国内开发习惯** - 考虑中文开发者的使用场景

### 3. **渐进式增强**
- **不破坏现有配置** - 智能检测并保留用户现有的脚本
- **可选择性覆盖** - 提供强制覆盖选项，但默认保护现有配置
- **向后兼容** - 支持从 husky 等其他工具的平滑迁移

### 4. **团队协作优先**
- **新成员友好** - 提供一键初始化脚本让新团队成员快速上手
- **自包含设计** - 项目包含所有必要的配置和脚本
- **跨平台兼容** - 支持不同的包管理器和操作系统

### 5. **工具链现代化**
- **使用 lefthook 替代 husky** - 更轻量级和稳定的 Git hooks 管理
- **智能包管理器检测** - 自动适配 npm/pnpm/yarn
- **Monorepo 支持** - 处理复杂的项目结构

## ✨ 特性

- ✅ **完全中文化界面** - 友好的中文交互体验
- ✅ **无字符长度限制** - 支持任意长度的中文提交信息
- ✅ **智能包管理器检测** - 自动检测并支持npm/pnpm/yarn
- ✅ **分支命名规范验证** - 自动验证分支名称格式
- ✅ **主分支保护机制** - 防止直接向主分支提交
- ✅ **使用lefthook替代husky** - 更轻量级和稳定的Git hooks管理
- ✅ **自动化版本发布** - 基于Conventional Commits的语义化版本管理

## 🚀 安装

```bash
# 全局安装
npm install -g gitgrove

# 或使用pnpm
pnpm add -g gitgrove

# 或使用yarn
yarn global add gitgrove
```

## 📝 使用方法

### 初始化Git工作流

在任意Node.js项目根目录下运行：

```bash
# 完整命令
gitgrove init

# 或使用简写
gg init

# 或直接运行（默认执行init命令）
gitgrove
```

### 命令选项

```bash
# 强制覆盖现有配置
gitgrove init --force

# 跳过依赖安装
gitgrove init --skip-install

# 指定包管理器
gitgrove init --npm    # 使用npm
gitgrove init --pnpm   # 使用pnpm
gitgrove init --yarn   # 使用yarn
```

### 其他命令

```bash
# 检查当前项目的Git工作流配置状态
gitgrove check

# 修复Git hooks冲突问题
gitgrove fix

# 显示帮助信息
gitgrove --help
```

## 🔧 配置内容

工具将自动创建以下配置文件和脚本：

### 为什么选择项目级配置？

很多开发者可能会疑问：既然 `gitgrove` 是全局安装的工具，为什么还要在每个项目中添加这么多配置和脚本？

**项目级配置的优势：**

1. **团队协作一致性** - 确保所有团队成员使用相同的工具版本和配置
2. **CI/CD 集成** - 持续集成环境可以直接使用项目中的工具，无需额外配置
3. **项目定制化** - 不同项目可以有不同的提交规范、分支策略和版本发布方式
4. **环境隔离** - 避免全局工具版本冲突，提高项目稳定性
5. **新成员上手** - 新团队成员只需运行 `npm install` 即可获得完整的开发环境

**这种设计模式在现代前端工具链中已成为标准**，如 `create-react-app`、`create-vue` 等都采用类似的方式。

### 配置文件
- `commitlint.config.js` - 提交信息验证规则（中文化，无字符限制）
- `.cz-config.js` - commitizen自定义配置（中文化界面）
- `lefthook.yml` - Git hooks配置（分支验证、提交验证）
- `.versionrc.js` - 版本发布配置（中文CHANGELOG）

### 辅助脚本
- `scripts/create-branch.sh` - 交互式分支创建脚本
- `scripts/setup.sh` - 团队成员快速初始化脚本
- `scripts/fix-hooks-conflict.sh` - Git hooks冲突修复脚本

### npm scripts

自动添加以下npm脚本命令：

```json
{
  "scripts": {
    // 提交相关
    "commit": "cz",
    "commit:quick": "git commit",
    "commit:simple": "简单交互式提交",
    
    // 版本发布
    "release": "standard-version",
    "release:major": "主版本发布",
    "release:minor": "次版本发布", 
    "release:patch": "补丁版本发布",
    
    // 分支管理
    "branch": "./scripts/create-branch.sh",
    "branch:feature": "功能分支创建提示",
    "branch:hotfix": "热修复分支创建提示",
    "branch:bugfix": "问题修复分支创建提示",
    
    // 配置和帮助
    "setup": "./scripts/setup.sh",
    "git:setup": "lefthook install",
    "git:fix": "./scripts/fix-hooks-conflict.sh",
    "help:git": "显示Git工作流帮助"
  }
}
```

## 🌿 分支命名规范

- **功能分支**: `feature_[模块]_[描述]`
  - 例: `feature_user_login`, `feature_payment_checkout`
  
- **热修复分支**: `hotfix_v[版本]_[描述]`
  - 例: `hotfix_v1.0.3_login_fix`, `hotfix_v2.1.0_security_patch`
  
- **问题修复分支**: `bugfix_[描述]`
  - 例: `bugfix_scroll_error`, `bugfix_memory_leak`

## 📝 提交类型

支持以下提交类型：

- `feat` - 新功能
- `fix` - 修复bug
- `docs` - 文档更新
- `style` - 代码格式(不影响代码运行的变动)
- `refactor` - 代码重构
- `perf` - 性能优化
- `test` - 增加测试
- `chore` - 构建过程或辅助工具的变动
- `build` - 构建系统或外部依赖的变动
- `ci` - CI配置文件和脚本的变动

## 🔄 工作流示例

1. **创建功能分支**:
   ```bash
   npm run branch
   # 选择 1) feature，然后输入模块名和功能描述
   ```

2. **规范化提交**:
   ```bash
   npm run commit
   # 使用交互式界面选择提交类型并输入描述
   ```

3. **版本发布**:
   ```bash
   npm run release
   # 自动生成CHANGELOG并创建版本标签
   ```

## 💡 设计理念

### 标准化 vs 灵活性

`gitgrove` 在标准化和灵活性之间寻求平衡：

- **标准化核心流程** - 提交规范、分支命名、版本发布等核心流程保持一致
- **保留定制空间** - 允许项目根据需要调整配置文件
- **渐进式采用** - 可以选择性使用部分功能，不强制全盘接受

### 开发者体验优先

- **零配置启动** - 一条命令完成所有配置
- **智能检测** - 自动检测项目环境和已有配置
- **友好提示** - 中文化的错误提示和操作指导
- **快速恢复** - 提供修复脚本处理常见问题

### 可维护性考虑

- **文档化配置** - 所有配置文件都有详细注释
- **版本管理** - 通过 package.json 锁定工具版本
- **备份机制** - 自动备份原有配置文件
- **团队共享** - 通过 Git 管理配置，确保团队同步

## 🛠️ 故障排除

### Git Hooks冲突

如果遇到Git hooks冲突问题，可以使用内置的修复工具：

```bash
# 使用工具修复
gitgrove fix

# 或使用npm script
npm run git:fix
```

### 依赖问题

如果依赖安装失败，可以手动安装：

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional commitizen cz-customizable lefthook standard-version
```

### 从Husky迁移

工具会自动清理旧的husky配置并迁移到lefthook。无需手动操作。

## 🤝 团队协作

新团队成员可以使用快速初始化脚本：

```bash
# 安装依赖并初始化Git hooks
npm run setup
```

## 📦 依赖包

工具会自动安装以下依赖：

- `@commitlint/cli` - 提交信息检查
- `@commitlint/config-conventional` - 标准提交规范
- `commitizen` - 交互式提交工具
- `cz-customizable` - 自定义提交配置
- `lefthook` - Git hooks管理
- `standard-version` - 自动版本发布

## 📄 许可证

MIT

## 🔗 相关链接

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Commitlint](https://commitlint.js.org/)
- [Lefthook](https://github.com/evilmartians/lefthook)
- [Standard Version](https://github.com/conventional-changelog/standard-version)


[![npm version](https://img.shields.io/npm/v/gitgrove.svg)](https://www.npmjs.com/package/gitgrove)
[![Downloads](https://img.shields.io/npm/dm/gitgrove.svg)](https://npmcharts.com/compare/gitgrove)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)