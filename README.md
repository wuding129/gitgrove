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

- ✅ **全局命令支持** - 安装后可在任意Git项目中使用`gg`命令
- ✅ **极简项目配置** - 项目中只保留必要的配置文件和npm scripts
- ✅ **完全中文化界面** - 友好的中文交互体验
- ✅ **无字符长度限制** - 支持任意长度的中文提交信息
- ✅ **智能包管理器检测** - 自动检测并支持npm/pnpm/yarn
- ✅ **包管理器限制** - 支持强制项目只使用特定包管理器，防止混用
- ✅ **wbox.config.json自动检测** - 检测到该文件时自动启用npm限制
- ✅ **分支命名规范验证** - 自动验证分支名称格式
- ✅ **主分支保护机制** - 防止直接向主分支提交
- ✅ **使用lefthook替代husky** - 更轻量级和稳定的Git hooks管理
- ✅ **自动化版本发布** - 基于Conventional Commits的语义化版本管理

## 🚀 快速开始

### 全局安装

```bash
npm install -g gitgrove
```

### 初始化项目

```bash
# 在任意Git项目中运行
gitgrove

# 或使用简写
gg
```

### 全局命令

安装后可在任意Git项目中使用：

```bash
# 添加文件到暂存区
gg add
# 或简写
gg a

# 添加指定文件
gg add src/file.js package.json
gg add .
# 或简写
gg a .

# 规范化提交
gg commit
# 或简写
gg c

# 跳过Git hooks限制进行提交
gg commit --no-hooks
# 或简写
gg c --no-hooks

# 创建规范化分支
gg branch
# 或简写  
gg b

# 团队成员快速初始化
gg setup
# 或简写
gg s

# 版本发布管理
gg release
# 或简写
gg r

# 快速版本发布
gg release --patch    # 补丁版本
gg release --minor    # 次版本  
gg release --major    # 主版本

# 检查项目配置
gg check

# 修复hooks冲突
gg fix
```

### 传统命令（仍然支持）

```bash
# 完整命令
gitgrove init
gitgrove check  
gitgrove fix
gitgrove commit
gitgrove branch
gitgrove setup
gitgrove release
```

### 项目初始化选项

```bash
# 强制覆盖现有配置
gitgrove init --force

# 跳过依赖安装
gitgrove init --skip-install

# 指定包管理器
gitgrove init --npm    # 使用npm
gitgrove init --pnpm   # 使用pnpm
gitgrove init --yarn   # 使用yarn

# 包管理器限制选项（强制项目只能使用指定的包管理器）
gitgrove init --only-npm    # 限制只能使用npm
gitgrove init --only-pnpm   # 限制只能使用pnpm
gitgrove init --only-yarn   # 限制只能使用yarn

# 组合使用示例
gitgrove init --only-npm --force    # 强制覆盖并限制使用npm
```

### 提交命令选项

```bash
# 规范化提交
gg commit

# 跳过所有Git hooks限制进行提交（用于紧急情况或特殊需求）
gg commit --no-hooks
```

**`--no-hooks` 选项说明：**
- 绕过所有Git hooks验证（包括pre-commit、commit-msg等）
- 允许直接提交到受保护的分支（如main/master）
- 适用于紧急修复、项目维护等特殊场景
- 仍然提供规范化的提交消息界面，确保提交质量

### 其他命令

```bash
# 检查当前项目的Git工作流配置状态
gitgrove check

# 修复Git hooks冲突问题
gitgrove fix

# 显示帮助信息
gitgrove --help
```

## 📦 包管理器限制功能

为了确保团队开发环境的一致性，`gitgrove` 支持包管理器限制功能，防止在同一项目中混用不同的包管理器。

### 🔒 包管理器限制选项

使用 `--only-*` 选项可以为项目添加包管理器限制：

```bash
# 限制只能使用npm
gitgrove init --only-npm

# 限制只能使用pnpm  
gitgrove init --only-pnpm

# 限制只能使用yarn
gitgrove init --only-yarn
```

### 🏗️ 自动检测wbox.config.json

如果项目根目录下存在 `wbox.config.json` 文件，工具会自动启用npm限制，无需手动指定：

```bash
# 如果存在wbox.config.json，自动启用--only-npm
gitgrove init  # 等同于 gitgrove init --only-npm
```

### ⚙️ 技术实现

启用包管理器限制后，工具会在 `package.json` 中添加 `preinstall` 脚本：

```json
{
  "scripts": {
    "preinstall": "npx only-allow npm",
    "prepare": "lefthook install"
  }
}
```

这个脚本会：
- ✅ 在每次安装依赖前检查使用的包管理器
- ❌ 如果使用了不被允许的包管理器，阻止安装并提示错误
- 📝 确保团队成员只能使用指定的包管理器

### 🎯 使用场景

**适用于以下场景：**

1. **团队协作项目** - 确保所有成员使用相同的包管理器
2. **CI/CD环境** - 避免在不同环境中使用不同包管理器导致的问题
3. **企业项目** - 统一技术栈和开发环境
4. **开源项目** - 为贡献者提供明确的开发环境要求

**示例错误提示：**
```bash
$ yarn install
Use "npm" for installation in this project
```

### 💡 最佳实践

1. **在项目初始化时就确定包管理器**
2. **在README中说明项目使用的包管理器**
3. **CI/CD脚本中也使用相同的包管理器**
4. **对于wbox项目，默认使用npm以保持一致性**

## 🔧 配置内容

工具将自动创建以下配置文件：

### 配置文件
- `commitlint.config.js` - 提交信息验证规则（中文化，无字符限制）
- `.cz-config.js` - commitizen自定义配置（中文化界面）
- `lefthook.yml` - Git hooks配置（分支验证、提交验证）
- `.versionrc.js` - 版本发布配置（中文CHANGELOG）

### npm scripts

只保留最核心的npm script：

```json
{
  "scripts": {
    "prepare": "lefthook install"
  }
}
```

### 🚀 版本发布现在更简单

所有版本发布功能都通过全局命令提供，无需项目中的npm scripts：

```bash
# 交互式版本发布
gg release

# 快速版本发布
gg release --patch    # 补丁版本 (1.0.0 -> 1.0.1)
gg release --minor    # 次版本 (1.0.0 -> 1.1.0)  
gg release --major    # 主版本 (1.0.0 -> 2.0.0)
```

### 全局命令优先

**新的设计理念**：大部分功能通过全局命令提供，项目中只保留必要的配置。

- ✅ **极简项目配置** - 项目中只保留必要的配置文件和npm scripts
- ✅ **全局命令支持** - 主要功能通过`gg`命令全局可用
- ✅ **无scripts文件夹** - 不再在项目中创建scripts文件夹

### ⚡ 为什么选择全局命令 + 最小配置？

**新设计的优势：**

1. **减少项目体积** - 不再创建scripts文件夹，项目更加轻量
2. **全局可用** - 安装一次，所有Git项目都能使用
3. **保持简洁** - 项目中只保留配置文件，没有冗余脚本
4. **易于维护** - 全局工具统一更新，无需每个项目单独维护脚本
5. **团队一致性** - 确保所有团队成员使用相同版本的工具

**项目级配置仍然重要：**
- 配置文件确保团队使用相同的规范
- npm scripts提供标准的版本发布流程
- lefthook hooks确保代码质量
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
   gg branch
   # 或使用简写：gg b
   # 选择 1) feature，然后输入模块名和功能描述
   ```

2. **添加文件到暂存区**:
   ```bash
   gg add
   # 或使用简写：gg a
   # 交互式选择要添加的文件
   
   # 直接添加指定文件
   gg add src/file.js package.json
   
   # 添加所有文件
   gg add .
   ```

3. **规范化提交**:
   ```bash
   gg commit
   # 或使用简写：gg c
   # 使用交互式界面选择提交类型并输入描述
   ```

4. **版本发布**:
   ```bash
   gg release
   # 或使用快捷选项
   gg release --patch    # 补丁版本
   gg release --minor    # 次版本
   gg release --major    # 主版本
   ```

5. **团队成员初始化**:
   ```bash
   gg setup
   # 或使用简写：gg s
   # 安装依赖并初始化Git hooks
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

### 包管理器限制问题

如果在安装依赖时遇到包管理器限制错误：

```bash
# 错误示例
Use "npm" for installation in this project
```

**解决方案：**
1. 使用项目指定的包管理器（如npm）
2. 检查项目根目录是否有 `wbox.config.json`（会自动启用npm限制）
3. 查看 `package.json` 中的 `preinstall` 脚本了解限制详情

### Git Hooks冲突

如果遇到Git hooks冲突问题，可以使用内置的修复工具：

```bash
# 使用全局命令修复
gg fix

# 或使用传统命令
gitgrove fix
```

### 依赖问题

如果依赖安装失败，可以手动安装：

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional commitizen cz-customizable lefthook standard-version
```

### 从Husky迁移

工具会自动清理旧的husky配置并迁移到lefthook。无需手动操作。

## 🤝 团队协作

新团队成员可以使用快速初始化：

```bash
# 使用全局命令快速初始化
gg setup

# 或使用简写
gg s
```

该命令会：
- 安装项目依赖
- 初始化Git hooks
- 配置Git用户信息（如果需要）

## 📦 依赖包

工具会自动安装以下依赖：

- `@commitlint/cli` - 提交信息检查
- `@commitlint/config-conventional` - 标准提交规范
- `commitizen` - 交互式提交工具
- `cz-customizable` - 自定义提交配置
- `lefthook` - Git hooks管理
- `standard-version` - 自动版本发布

**包管理器限制功能依赖：**
- `only-allow` - 包管理器限制工具（通过npx使用，无需安装）

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
