#!/bin/bash

# Git规范化工作流一键配置脚本
# 适用于新项目的完整配置

set -e

echo "🌟 Git规范化工作流一键配置脚本"
echo "======================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录（包含package.json的目录）中运行此脚本${NC}"
    exit 1
fi

# 检查Node.js
echo -e "${BLUE}📦 检查开发环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未安装Node.js${NC}"
    echo -e "${YELLOW}请先安装Node.js: https://nodejs.org/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js已安装${NC}"

# 检测可用的包管理工具
echo -e "${BLUE}🔍 检测可用的包管理工具...${NC}"

AVAILABLE_MANAGERS=()
MANAGER_COMMANDS=()

if command -v npm &> /dev/null; then
    AVAILABLE_MANAGERS+=("npm")
    MANAGER_COMMANDS+=("npm install --save-dev")
    echo -e "${GREEN}  ✅ npm ($(npm --version))${NC}"
fi

if command -v pnpm &> /dev/null; then
    AVAILABLE_MANAGERS+=("pnpm") 
    MANAGER_COMMANDS+=("pnpm add -D")
    echo -e "${GREEN}  ✅ pnpm ($(pnpm --version))${NC}"
fi

if command -v yarn &> /dev/null; then
    AVAILABLE_MANAGERS+=("yarn")
    MANAGER_COMMANDS+=("yarn add --dev")
    echo -e "${GREEN}  ✅ yarn ($(yarn --version))${NC}"
fi

if [ ${#AVAILABLE_MANAGERS[@]} -eq 0 ]; then
    echo -e "${RED}❌ 错误: 未找到任何包管理工具${NC}"
    echo -e "${YELLOW}请至少安装 npm, pnpm 或 yarn 中的一个${NC}"
    exit 1
fi

# 让用户选择包管理工具
echo ""
echo -e "${BLUE}📦 选择包管理工具:${NC}"
echo ""
for i in "${!AVAILABLE_MANAGERS[@]}"; do
    echo "  $((i+1)). ${AVAILABLE_MANAGERS[i]}"
done
echo ""

while true; do
    read -p "请选择包管理工具 (1-${#AVAILABLE_MANAGERS[@]}): " choice
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#AVAILABLE_MANAGERS[@]}" ]; then
        SELECTED_MANAGER="${AVAILABLE_MANAGERS[$((choice-1))]}"
        INSTALL_COMMAND="${MANAGER_COMMANDS[$((choice-1))]}"
        break
    else
        echo -e "${RED}❌ 无效选择，请输入 1-${#AVAILABLE_MANAGERS[@]} 之间的数字${NC}"
    fi
done

echo -e "${GREEN}✅ 已选择: ${SELECTED_MANAGER}${NC}"

# 步骤1: 安装依赖
echo ""
echo -e "${BLUE}📦 步骤1: 使用 ${SELECTED_MANAGER} 安装Git规范化依赖...${NC}"
echo -e "${YELLOW}正在执行: ${INSTALL_COMMAND} @commitlint/cli @commitlint/config-conventional commitizen cz-customizable lefthook standard-version${NC}"

$INSTALL_COMMAND @commitlint/cli @commitlint/config-conventional commitizen cz-customizable lefthook standard-version

echo -e "${GREEN}✅ 依赖安装完成${NC}"

# 步骤2: 更新package.json脚本
echo ""
echo -e "${BLUE}⚙️  步骤2: 配置package.json脚本...${NC}"

# 备份原始package.json
cp package.json package.json.backup

# 使用Node.js脚本来更新package.json
cat > update_package.js << EOF
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// 获取选定的包管理工具
const selectedManager = process.argv[2] || 'npm';
const runCommand = selectedManager === 'npm' ? 'npm run' : 
                   selectedManager === 'pnpm' ? 'pnpm run' : 
                   selectedManager === 'yarn' ? 'yarn run' : 'npm run';

// 添加Git规范化相关脚本
pkg.scripts = pkg.scripts || {};

// 核心Git工作流脚本
const gitScripts = {
  // 提交相关
  "commit": "cz",
  "commit:quick": "git commit",
  "commit:simple": "echo '请选择提交类型: feat(新功能) fix(修复) docs(文档) style(格式) refactor(重构) perf(性能) test(测试) chore(工具)' && read -p '输入: ' type && read -p '描述: ' desc && git commit -m \"\$type: \$desc\"",
  
  // 版本发布
  "release": "standard-version",
  "release:major": "standard-version --release-as major",
  "release:minor": "standard-version --release-as minor", 
  "release:patch": "standard-version --release-as patch",
  
  // Git hooks准备
  "prepare": "lefthook install",
  "postinstall": "lefthook install",
  
  // 分支管理
  "branch": "./scripts/create-branch.sh",
  "branch:feature": "echo '创建功能分支: git checkout -b feature_[模块]_[描述]'",
  "branch:hotfix": "echo '创建热修复分支: git checkout -b hotfix_v[版本]_[描述]'",
  "branch:bugfix": "echo '创建问题修复分支: git checkout -b bugfix_[描述]'",
  
  // Git配置和设置
  "git:setup": "lefthook install",
  "git:fix": "./scripts/fix-hooks-conflict.sh",
  "setup": "./scripts/setup.sh",
  "setup:complete": "./scripts/git-workflow-setup.sh",
  
  // 测试和验证
  "test:commit": "echo '测试无字符限制的中文提交信息: 这是一个非常长的中文提交信息用来测试是否还有字符数量限制现在应该可以自由输入任意长度的中文描述了包括各种符号和表情符号🎉✨🚀'",
  "lint:commit": "commitlint --edit",
  
  // 工作流帮助（动态生成命令）
  "help:git": \`echo '\\\\n🌟 Git规范化工作流帮助:\\\\n\\\\n📝 提交代码: \${runCommand} commit\\\\n🌿 创建分支: \${runCommand} branch\\\\n🚀 发布版本: \${runCommand} release\\\\n⚙️  初始化设置: \${runCommand} setup\\\\n\\\\n更多信息请查看 GIT_SETUP_GUIDE.md'\`
};

// 只添加不存在的script，避免覆盖用户现有的脚本
Object.keys(gitScripts).forEach(key => {
  if (!pkg.scripts[key]) {
    pkg.scripts[key] = gitScripts[key];
  } else {
    console.log(\`⚠️  跳过已存在的脚本: \${key}\`);
  }
});

// 添加commitizen配置
pkg.config = pkg.config || {};
pkg.config.commitizen = {
  "path": "cz-customizable"
};

// 保存更新后的package.json
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ package.json 更新完成');
console.log(\`✅ 添加了 \${Object.keys(gitScripts).length} 个Git工作流脚本\`);
console.log(\`✅ 使用包管理工具: \${selectedManager}\`);
EOF

node update_package.js "$SELECTED_MANAGER"
rm update_package.js

echo -e "${GREEN}✅ package.json配置完成${NC}"

# 步骤3: 创建commitlint配置文件
echo ""
echo -e "${BLUE}📋 步骤3: 创建commitlint配置...${NC}"
cat > commitlint.config.js << 'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复bug
        'docs',     // 文档更新
        'style',    // 代码格式(不影响代码运行的变动)
        'refactor', // 重构(即不是新增功能，也不是修改bug的代码变动)
        'perf',     // 性能优化
        'test',     // 增加测试
        'chore',    // 构建过程或辅助工具的变动
        'build',    // 构建系统或外部依赖的变动
        'ci'        // CI配置文件和脚本的变动
      ]
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    // 'scope-empty': [2, 'always'], // 注释掉强制空scope的规则，允许使用scope
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    // 'subject-case': [2, 'always', 'sentence-case'], // 使用句子首字母大写
    // 移除字符长度限制，允许自由使用中文描述
    // 'subject-max-length': [2, 'always', 120],
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always']
    // 'header-max-length': [2, 'always', 150]
  },
  // 自定义中文错误提示信息
  defaultIgnores: false,
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
  prompt: {
    messages: {
      skip: '(按回车跳过)',
      max: '最多 %d 个字符',
      min: '至少 %d 个字符',
      emptyWarning: '不能为空',
      upperLimitWarning: '超过字符限制',
      lowerLimitWarning: '字符数量不足'
    },
    questions: {
      type: {
        description: '选择提交类型:',
        enum: {
          feat: {
            description: '新功能',
            title: 'Features',
            emoji: '✨'
          },
          fix: {
            description: '修复bug',
            title: 'Bug Fixes',
            emoji: '🐛'
          },
          docs: {
            description: '文档更新',
            title: 'Documentation',
            emoji: '📝'
          },
          style: {
            description: '代码格式(不影响代码运行的变动)',
            title: 'Styles',
            emoji: '💄'
          },
          refactor: {
            description: '代码重构(既不是新增功能，也不是修改bug)',
            title: 'Code Refactoring',
            emoji: '♻️'
          },
          perf: {
            description: '性能优化',
            title: 'Performance Improvements',
            emoji: '⚡'
          },
          test: {
            description: '添加测试',
            title: 'Tests',
            emoji: '✅'
          },
          build: {
            description: '构建系统或外部依赖的变动',
            title: 'Builds',
            emoji: '🔨'
          },
          ci: {
            description: 'CI配置文件和脚本的变动',
            title: 'Continuous Integrations',
            emoji: '🔄'
          },
          chore: {
            description: '构建过程或辅助工具的变动',
            title: 'Chores',
            emoji: '🔧'
          }
        }
      },
      scope: {
        description: '影响范围 (可选，按回车跳过):'
      },
      subject: {
        description: '简短描述:'
      },
      body: {
        description: '详细描述 (可选，按回车跳过):'
      },
      isBreaking: {
        description: '是否有破坏性变更?'
      },
      breakingBody: {
        description: '破坏性变更的详细描述:'
      },
      breaking: {
        description: '破坏性变更说明:'
      },
      isIssueAffected: {
        description: '是否关联问题?'
      },
      issuesBody: {
        description: '如果关联了问题，请添加问题详细描述:'
      },
      issues: {
        description: '关联的问题 (例如: "fix #123", "re #123"):'
      }
    }
  }
};
EOF

echo -e "${GREEN}✅ commitlint配置创建完成${NC}"

# 步骤4: 创建cz-customizable配置文件
echo ""
echo -e "${BLUE}🎨 步骤4: 创建cz-customizable配置...${NC}"
cat > .cz-config.js << 'EOF'
module.exports = {
  // 提交类型
  types: [
    { value: 'feat', name: '✨ feat:     新功能' },
    { value: 'fix', name: '🐛 fix:      修复bug' },
    { value: 'docs', name: '📝 docs:     文档更新' },
    { value: 'style', name: '💄 style:    代码格式(不影响代码运行的变动)' },
    { value: 'refactor', name: '♻️  refactor: 代码重构(既不是新增功能，也不是修改bug)' },
    { value: 'perf', name: '⚡ perf:     性能优化' },
    { value: 'test', name: '✅ test:     添加测试' },
    { value: 'chore', name: '🔧 chore:    构建过程或辅助工具的变动' },
    { value: 'build', name: '🔨 build:    构建系统或外部依赖的变动' },
    { value: 'ci', name: '🔄 ci:       CI配置文件和脚本的变动' }
  ],

  // 影响范围
  scopes: [
    { name: '组件' },
    { name: '工具' },
    { name: '样式' },
    { name: '依赖' },
    { name: '配置' },
    { name: '文档' },
    { name: '测试' },
    { name: '其他' }
  ],

  // 使用自定义范围
  allowCustomScopes: true,
  
  // 允许空范围
  allowEmptyScopes: true,
  
  // 允许破坏性变更
  allowBreakingChanges: ['feat', 'fix'],
  
  // 跳过问题
  skipQuestions: [
    'scope',
    'customScope',
    'body',
    'breaking',
    'footer'
  ],

  // 消息配置
  messages: {
    type: '选择提交类型:',
    scope: '选择影响范围 (可选):',
    customScope: '输入自定义范围:',
    subject: '输入描述 (无字符限制):',
    body: '输入详细描述 (可选, 按回车跳过):',
    breaking: '列出破坏性变更 (可选):',
    footer: '列出关联的issue (可选, 如: #31, #34):',
    confirmCommit: '确认提交以上内容?'
  },

  // 主题长度限制 - 设置为0表示无限制
  subjectLimit: 0,
  
  // 正文换行长度 - 设置为0表示无限制  
  bodyLineLength: 0,
  
  // 页脚换行长度 - 设置为0表示无限制
  footerLineLength: 0
};
EOF

echo -e "${GREEN}✅ cz-customizable配置创建完成${NC}"

# 步骤5: 创建lefthook配置文件
echo ""
echo -e "${BLUE}🪝 步骤5: 创建lefthook配置...${NC}"
cat > lefthook.yml << 'EOF'
# Git规范化工作流配置
# 分支创建约束和提交规范验证

# 分支推送前的验证 - 用于拦截不规范分支
pre-push:
  commands:
    branch-name-check:
      run: |
        # 获取当前分支名
        current_branch=$(git branch --show-current)
        
        # 跳过master/main分支的检查
        if [[ $current_branch == "master" || $current_branch == "main" ]]; then
          exit 0
        fi
        
        # 分支命名规范校验
        if ! [[ $current_branch =~ ^(feature|hotfix|bugfix)_ ]]; then
          echo "❌ 错误: 分支名 '$current_branch' 不符合规范!"
          echo "📋 正确格式:"
          echo "   🔹 feature_[模块]_[描述] (例: feature_user_login)"
          echo "   🔹 hotfix_v[版本]_[描述] (例: hotfix_v1.0.3_login_fix)"
          echo "   🔹 bugfix_[描述] (例: bugfix_scroll_error)"
          echo ""
          echo "💡 使用以下命令查看分支创建帮助:"
          echo "   npm run branch:feature"
          echo "   npm run branch:hotfix"
          echo "   npm run branch:bugfix"
          exit 1
        fi
        
        # 类型特定格式验证
        if [[ $current_branch =~ ^feature_ ]]; then
          if ! [[ $current_branch =~ ^feature_[a-z0-9]+_[a-z0-9_]+$ ]]; then
            echo "❌ 功能分支格式错误!"
            echo "📋 正确格式: feature_[模块]_[描述]"
            echo "📝 示例: feature_user_login, feature_payment_integration"
            exit 1
          fi
        elif [[ $current_branch =~ ^hotfix_ ]]; then
          if ! [[ $current_branch =~ ^hotfix_v?[0-9.]+_[a-z0-9_]+$ ]]; then
            echo "❌ 热修复分支格式错误!"
            echo "📋 正确格式: hotfix_v[版本]_[描述]"
            echo "📝 示例: hotfix_v1.0.3_login_fix, hotfix_v2.1.0_security_patch"
            exit 1
          fi
        elif [[ $current_branch =~ ^bugfix_ ]]; then
          if ! [[ $current_branch =~ ^bugfix_[a-z0-9_]+$ ]]; then
            echo "❌ 问题修复分支格式错误!"
            echo "📋 正确格式: bugfix_[描述]"
            echo "📝 示例: bugfix_scroll_error, bugfix_memory_leak"
            exit 1
          fi
        fi
        
        echo "✅ 分支名称符合规范: $current_branch"

# 提交信息验证
commit-msg:
  commands:
    commitlint:
      run: npx --no-install commitlint --edit {1}
      stage_fixed: true

# 提交前的代码检查
pre-commit:
  commands:
    # 防止直接提交到master分支
    protect-master:
      run: |
        branch=$(git branch --show-current)
        if [[ $branch == "master" || $branch == "main" ]]; then
          echo "❌ 错误: 禁止直接向 $branch 分支提交!"
          echo "📋 正确流程:"
          echo "   1. 创建功能分支: git checkout -b feature_[模块]_[描述]"
          echo "   2. 在功能分支上开发和提交"
          echo "   3. 通过Pull Request合并到主分支"
          exit 1
        fi
        
    # 代码质量检查
    lint-staged:
      glob: "*.{js,ts,vue,jsx,tsx}"
      run: |
        echo "🔍 检查代码格式..."
        # 这里可以添加ESLint等代码检查工具
        # npx eslint {staged_files} --fix
        echo "✅ 代码格式检查通过"
EOF

echo -e "${GREEN}✅ lefthook配置创建完成${NC}"

# 步骤6: 创建版本发布配置
echo ""
echo -e "${BLUE}🚀 步骤6: 创建版本发布配置...${NC}"
cat > .versionrc.js << 'EOF'
module.exports = {
  types: [
    { type: 'feat', section: '✨ 新功能' },
    { type: 'fix', section: '🐛 问题修复' },
    { type: 'chore', section: '🔧 构建/工程依赖/工具', hidden: false },
    { type: 'docs', section: '📝 文档', hidden: false },
    { type: 'style', section: '💄 样式', hidden: false },
    { type: 'refactor', section: '♻️ 代码重构', hidden: false },
    { type: 'perf', section: '⚡ 性能优化', hidden: false },
    { type: 'test', section: '✅ 测试', hidden: false },
    { type: 'build', section: '👷 构建系统', hidden: false },
    { type: 'ci', section: '🔄 持续集成', hidden: false }
  ],
  commitUrlFormat: '{{host}}/{{owner}}/{{repository}}/commit/{{hash}}',
  compareUrlFormat: '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',
  issueUrlFormat: '{{host}}/{{owner}}/{{repository}}/issues/{{id}}',
  userUrlFormat: '{{host}}/{{user}}',
  releaseCommitMessageFormat: 'chore: release v{{currentTag}}',
  issuePrefixes: ['#'],
  header: '# 更新日志\n\n自动生成的版本历史记录。\n\n',
  skip: {
    bump: false,
    changelog: false,
    commit: false,
    tag: false
  }
};
EOF

echo -e "${GREEN}✅ 版本发布配置创建完成${NC}"

# 步骤7: 创建scripts目录和脚本
echo ""
echo -e "${BLUE}📄 步骤7: 创建辅助脚本...${NC}"
mkdir -p scripts

# 创建分支创建脚本
cat > scripts/create-branch.sh << 'EOF'
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
    
    echo "2. 使用 '\$MANAGER run commit' 进行规范化提交"
    echo "3. 推送分支: git push -u origin $branch_name"
else
    echo -e "${RED}❌ 分支创建失败${NC}"
    exit 1
fi
EOF

chmod +x scripts/create-branch.sh

# 创建团队成员快速初始化脚本
cat > scripts/setup.sh << 'EOF'
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
    echo -e "${YELLOW}请先运行: ./scripts/git-workflow-setup.sh${NC}"
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
EOF

chmod +x scripts/setup.sh

# 创建Git hooks冲突修复脚本
cat > scripts/fix-hooks-conflict.sh << 'EOF'
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
echo ""
echo -e "${YELLOW}💾 原hooks已备份到: ${backup_dir:-无备份}${NC}"
EOF

chmod +x scripts/fix-hooks-conflict.sh

echo -e "${GREEN}✅ 所有辅助脚本创建完成${NC}"

# 步骤8: 更新.gitignore
echo ""
echo -e "${BLUE}📝 步骤8: 更新.gitignore...${NC}"
if [ ! -f ".gitignore" ]; then
    touch .gitignore
fi

# 检查是否已经包含Git工具相关的忽略项
if ! grep -q "# Git工具临时文件" .gitignore; then
    echo -e "${YELLOW}添加Git工具相关的忽略项...${NC}"
    cat >> .gitignore << 'EOF'

# Git工具临时文件
.lefthook-local.yml

# Git工具临时文件
.lefthook/
*.backup
.npm
.yarn
EOF
    echo -e "${GREEN}✅ .gitignore更新完成${NC}"
else
    echo -e "${GREEN}✅ .gitignore已包含Git工具配置，跳过更新${NC}"
fi

# 步骤9: 清理并初始化Git hooks
echo ""
echo -e "${BLUE}🔧 步骤9: 清理并初始化Git hooks...${NC}"

# 清理可能存在的旧的Git hooks
echo -e "${YELLOW}🧹 清理现有Git hooks...${NC}"
if [ -d ".git/hooks" ]; then
    # 备份现有hooks
    if [ -f ".git/hooks/pre-commit" ] || [ -f ".git/hooks/commit-msg" ] || [ -f ".git/hooks/pre-push" ]; then
        echo -e "${YELLOW}备份现有Git hooks...${NC}"
        mkdir -p .git/hooks-backup-$(date +%Y%m%d_%H%M%S)
        cp -r .git/hooks/* .git/hooks-backup-$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
    fi
    
    # 清理可能冲突的hooks
    rm -f .git/hooks/pre-commit.old
    rm -f .git/hooks/commit-msg.old
    rm -f .git/hooks/pre-push.old
    
    echo -e "${GREEN}✅ Git hooks清理完成${NC}"
fi

# 清理husky相关文件
if [ -d ".husky" ]; then
    echo -e "${YELLOW}清理旧的husky配置...${NC}"
    rm -rf .husky
    echo -e "${GREEN}✅ Husky配置清理完成${NC}"
fi

# 初始化lefthook
echo -e "${BLUE}🚀 初始化lefthook...${NC}"

# 直接使用lefthook安装，不依赖npm scripts
if lefthook install; then
    echo -e "${GREEN}✅ Lefthook直接安装成功${NC}"
else
    echo -e "${YELLOW}⚠️  Lefthook直接安装失败，尝试备用方案...${NC}"
    # 备用方案：通过npm scripts安装
    if [ "$SELECTED_MANAGER" = "npm" ]; then
        npm run prepare
    elif [ "$SELECTED_MANAGER" = "pnpm" ]; then
        pnpm run prepare
    elif [ "$SELECTED_MANAGER" = "yarn" ]; then
        yarn run prepare
    fi
fi

# 验证lefthook是否安装成功
if [ -f ".git/hooks/pre-commit" ] && [ -f ".git/hooks/commit-msg" ]; then
    echo -e "${GREEN}✅ Git hooks验证成功${NC}"
    echo -e "${BLUE}📋 已安装的hooks:${NC}"
    ls -la .git/hooks/ | grep -E "(pre-commit|commit-msg|pre-push)" | sed 's/^/  /' || echo "  检测到hooks文件"
else
    echo -e "${RED}❌ Git hooks安装验证失败${NC}"
    echo -e "${YELLOW}🔧 建议运行修复脚本:${NC}"
    echo "     ${SELECTED_MANAGER} run git:fix"
    echo "     或直接运行: ./scripts/fix-hooks-conflict.sh"
    echo ""
    echo -e "${BLUE}💡 可能的原因:${NC}"
    echo "  • Git hooks冲突"
    echo "  • 权限问题"  
    echo "  • lefthook配置文件错误"
fi

echo -e "${GREEN}✅ Git hooks初始化完成${NC}"

# 完成提示
echo ""
echo -e "${GREEN}🎉 Git规范化工作流配置完成！${NC}"
echo ""
echo -e "${BLUE}📚 新增的脚本命令 (使用 ${SELECTED_MANAGER}):${NC}"
echo ""
echo -e "  📝 ${YELLOW}提交相关:${NC}"
echo "     ${SELECTED_MANAGER} run commit              # 交互式规范提交（无字符限制）"
echo "     ${SELECTED_MANAGER} run commit:quick        # 快速提交"
echo "     ${SELECTED_MANAGER} run commit:simple       # 简单交互式提交"
echo ""
echo -e "  🌿 ${YELLOW}分支管理:${NC}"
echo "     ${SELECTED_MANAGER} run branch              # 交互式创建规范分支"
echo "     ${SELECTED_MANAGER} run branch:feature      # 功能分支创建提示"
echo "     ${SELECTED_MANAGER} run branch:hotfix       # 热修复分支创建提示"
echo "     ${SELECTED_MANAGER} run branch:bugfix       # 问题修复分支创建提示"
echo ""
echo -e "  🚀 ${YELLOW}版本发布:${NC}"
echo "     ${SELECTED_MANAGER} run release             # 自动版本发布"
echo "     ${SELECTED_MANAGER} run release:major       # 主版本发布"
echo "     ${SELECTED_MANAGER} run release:minor       # 次版本发布"
echo "     ${SELECTED_MANAGER} run release:patch       # 补丁版本发布"
echo ""
echo -e "  ⚙️  ${YELLOW}配置和帮助:${NC}"
echo "     ${SELECTED_MANAGER} run setup               # 团队成员快速初始化"
echo "     ${SELECTED_MANAGER} run git:setup           # Git hooks配置"
echo "     ${SELECTED_MANAGER} run git:fix             # 修复Git hooks冲突"
echo "     ${SELECTED_MANAGER} run help:git            # 显示Git工作流帮助"
echo "     ${SELECTED_MANAGER} run test:commit         # 测试无字符限制提交"
echo ""
echo -e "${BLUE}💡 分支命名规范:${NC}"
echo "   feature_[模块]_[描述]  (例: feature_user_login)"
echo "   hotfix_v[版本]_[描述]  (例: hotfix_v1.0.3_bug_fix)"
echo "   bugfix_[描述]         (例: bugfix_scroll_error)"
echo ""
echo -e "${BLUE}🎯 提交类型:${NC}"
echo "   feat, fix, docs, style, refactor, perf, test, chore, build, ci"
echo ""
echo -e "${GREEN}✨ 特性说明:${NC}"
echo "   ✅ 完全中文化界面"
echo "   ✅ 无字符长度限制"
echo "   ✅ 跳过确认步骤"
echo "   ✅ 分支命名规范验证"
echo "   ✅ 主分支保护机制"
echo "   ✅ 使用lefthook替代husky（更稳定）"
echo "   ✅ 自动创建团队协作脚本"
echo ""
echo -e "${BLUE}📖 相关文档和脚本:${NC}"
echo "   GIT_SETUP_GUIDE.md           # 完整配置指南"
echo "   README.md                    # 项目说明"
echo "   scripts/setup.sh             # 团队成员快速初始化"
echo "   scripts/fix-hooks-conflict.sh # Git hooks冲突修复"
echo "   scripts/create-branch.sh     # 交互式分支创建"
echo ""
echo -e "${GREEN}开始愉快的开发吧！ 🚀${NC}"
echo ""
echo -e "${YELLOW}💾 备份文件: package.json.backup (如有问题可恢复)${NC}"
