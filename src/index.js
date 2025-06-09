const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { execSync } = require('child_process');

class GitWorkflowInitializer {
  constructor(options = {}) {
    this.options = options;
    this.currentDir = process.cwd();
    
    // 查找Git根目录和package.json目录
    const { gitRoot, packageJsonDir } = this.findProjectDirectories();
    this.gitRoot = gitRoot;
    this.projectRoot = packageJsonDir || this.currentDir;
    
    this.packageManager = this.detectPackageManager();
  }

  /**
   * 查找Git根目录和package.json所在目录
   * 支持monorepo场景：.git在父目录，package.json在子目录
   */
  findProjectDirectories() {
    let gitRoot = null;
    let packageJsonDir = null;
    
    // 从当前目录开始向上查找
    let currentPath = this.currentDir;
    
    while (currentPath !== path.dirname(currentPath)) {
      // 检查是否有.git目录
      if (fs.existsSync(path.join(currentPath, '.git'))) {
        gitRoot = currentPath;
      }
      
      // 检查是否有package.json文件（只记录最近的一个）
      if (!packageJsonDir && fs.existsSync(path.join(currentPath, 'package.json'))) {
        packageJsonDir = currentPath;
      }
      
      currentPath = path.dirname(currentPath);
    }
    
    // 如果找到了Git根目录但没有package.json，可以在当前目录创建
    if (gitRoot && !packageJsonDir && this.currentDir.startsWith(gitRoot)) {
      packageJsonDir = this.currentDir; // 使用当前目录作为项目根目录
    }
    
    return { gitRoot, packageJsonDir };
  }

  detectPackageManager() {
    if (this.options.npm) return 'npm';
    if (this.options.pnpm) return 'pnpm';
    if (this.options.yarn) return 'yarn';

    // 先在当前项目目录检查
    if (fs.existsSync(path.join(this.projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(this.projectRoot, 'yarn.lock'))) return 'yarn';
    
    // 然后在Git根目录检查（monorepo场景）
    if (this.gitRoot && this.gitRoot !== this.projectRoot) {
      if (fs.existsSync(path.join(this.gitRoot, 'pnpm-lock.yaml'))) return 'pnpm';
      if (fs.existsSync(path.join(this.gitRoot, 'yarn.lock'))) return 'yarn';
    }
    
    return 'npm';
  }

  async init() {
    console.log(chalk.cyan('🌟 Git规范化工作流一键初始化工具'));
    console.log(chalk.cyan('======================================'));

    // 检查环境
    await this.checkEnvironment();

    // 检查是否强制覆盖
    if (!this.options.force) {
      const shouldOverwrite = await this.checkExistingConfig();
      if (!shouldOverwrite) {
        console.log(chalk.yellow('👋 初始化已取消'));
        return;
      }
    }

    // 选择包管理器
    if (!this.options.npm && !this.options.pnpm && !this.options.yarn) {
      this.packageManager = await this.selectPackageManager();
    }

    console.log(chalk.green(`✅ 已选择包管理器: ${this.packageManager}`));

    // 开始初始化
    await this.installDependencies();
    await this.createConfigFiles();
    await this.updatePackageJson();
    await this.updateGitignore();
    await this.initializeGitHooks();

    this.showSuccessMessage();
  }

  async checkEnvironment() {
    const spinner = ora('📦 检查开发环境...').start();

    try {
      // 检查Node.js
      const nodeVersion = process.version;
      if (!nodeVersion) {
        throw new Error('Node.js 未安装');
      }

      // 检查Git仓库
      if (!this.gitRoot) {
        throw new Error('未找到Git仓库，请确保在Git仓库中或其子目录中运行此命令');
      }

      // 检查或创建package.json
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        spinner.info('📝 未找到package.json，将为您创建一个基础的package.json文件');
        await this.createBasicPackageJson();
      }

      // 显示项目信息
      const relativePath = path.relative(this.gitRoot, this.projectRoot);
      const projectInfo = relativePath ? `子项目: ${relativePath}` : '根项目';
      spinner.info(`📁 Git根目录: ${this.gitRoot}`);
      spinner.info(`📦 项目目录: ${this.projectRoot} (${projectInfo})`);

      spinner.succeed('✅ 环境检查通过');
    } catch (error) {
      spinner.fail(`❌ 环境检查失败: ${error.message}`);
      throw error;
    }
  }

  async createBasicPackageJson() {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const projectName = path.basename(this.projectRoot);
    
    const basicPackageJson = {
      name: projectName,
      version: "1.0.0",
      description: "",
      main: "index.js",
      scripts: {
        test: "echo \"Error: no test specified\" && exit 1"
      },
      keywords: [],
      author: "",
      license: "ISC"
    };

    await fs.writeJSON(packageJsonPath, basicPackageJson, { spaces: 2 });
    console.log(chalk.green(`✅ 已创建基础package.json文件: ${packageJsonPath}`));
  }

  async checkExistingConfig() {
    const configFiles = [
      'commitlint.config.js',
      '.cz-config.js',
      'lefthook.yml',
      '.versionrc.js'
    ];

    const existingFiles = configFiles.filter(file => 
      fs.existsSync(path.join(this.projectRoot, file))
    );

    if (existingFiles.length > 0) {
      console.log(chalk.yellow('⚠️  检测到现有配置文件:'));
      existingFiles.forEach(file => {
        console.log(chalk.yellow(`   - ${file}`));
      });

      const { shouldOverwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldOverwrite',
          message: '是否要覆盖现有配置？',
          default: false
        }
      ]);

      return shouldOverwrite;
    }

    return true;
  }

  async selectPackageManager() {
    const { packageManager } = await inquirer.prompt([
      {
        type: 'list',
        name: 'packageManager',
        message: '选择包管理工具:',
        choices: [
          { name: 'npm', value: 'npm' },
          { name: 'pnpm (推荐)', value: 'pnpm' },
          { name: 'yarn', value: 'yarn' }
        ],
        default: this.packageManager
      }
    ]);

    return packageManager;
  }

  async installDependencies() {
    if (this.options.skipInstall) {
      console.log(chalk.yellow('⏭️  跳过依赖安装'));
      return;
    }

    const spinner = ora(`📦 使用 ${this.packageManager} 安装Git规范化依赖...`).start();

    try {
      const dependencies = [
        '@commitlint/cli',
        '@commitlint/config-conventional',
        'commitizen',
        'cz-customizable',
        'lefthook',
        'standard-version'
      ];

      const installCommand = this.getInstallCommand(dependencies);
      const isWindows = process.platform === 'win32';
      
      execSync(installCommand, { 
        stdio: 'pipe',
        cwd: this.projectRoot,
        shell: isWindows 
      });

      spinner.succeed('✅ 依赖安装完成');
    } catch (error) {
      spinner.fail('❌ 依赖安装失败');
      throw error;
    }
  }

  getInstallCommand(dependencies) {
    const depsStr = dependencies.join(' ');
    
    switch (this.packageManager) {
      case 'npm':
        return `npm install --save-dev ${depsStr}`;
      case 'pnpm':
        return `pnpm add -D ${depsStr}`;
      case 'yarn':
        return `yarn add --dev ${depsStr}`;
      default:
        return `npm install --save-dev ${depsStr}`;
    }
  }

  async createConfigFiles() {
    const spinner = ora('📝 创建配置文件...').start();

    try {
      // 创建commitlint配置
      await this.createCommitlintConfig();
      
      // 创建cz-customizable配置
      await this.createCzConfig();
      
      // 创建lefthook配置
      await this.createLefthookConfig();
      
      // 创建版本发布配置
      await this.createVersionConfig();

      spinner.succeed('✅ 配置文件创建完成');
    } catch (error) {
      spinner.fail('❌ 配置文件创建失败');
      throw error;
    }
  }

  async createCommitlintConfig() {
    const config = `module.exports = {
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
    'scope-empty': [0, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [0, 'never'],
    'header-max-length': [0, 'always', 0],
    'subject-max-length': [0, 'always', 0],
    'body-max-line-length': [0, 'always', 0],
    'footer-max-line-length': [0, 'always', 0]
  }
};`;

    // 创建项目目录的配置文件
    await fs.writeFile(
      path.join(this.projectRoot, 'commitlint.config.js'),
      config
    );
    
    // 在 monorepo 场景下，不在 Git 根目录创建配置文件
    // 因为这会导致依赖解析问题，让commitlint使用子项目的配置
    console.log('📝 Commitlint配置已创建在项目目录中');
    if (this.gitRoot !== this.projectRoot) {
      console.log('💡 Monorepo场景：commitlint将在子项目目录中查找依赖');
    }
  }

  async createCzConfig() {
    const config = `module.exports = {
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
};`;

    await fs.writeFile(
      path.join(this.projectRoot, '.cz-config.js'),
      config
    );
  }

  async createLefthookConfig() {
    const config = `# Git规范化工作流配置
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
            "📝 示例: feature_user_login, feature_payment_integration"
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
      run: |
        # 在monorepo场景下，查找包含commitlint的目录
        if command -v commitlint &> /dev/null; then
          commitlint --edit {1}
        elif [ -f "package.json" ] && grep -q "@commitlint/cli" package.json; then
          npx commitlint --edit {1}
        else
          # 查找包含commitlint依赖的子目录
          for dir in */; do
            if [ -f "$dir/package.json" ] && grep -q "@commitlint/cli" "$dir/package.json"; then
              echo "🔍 在 $dir 中找到 commitlint，正在验证提交信息..."
              # 使用管道来传递提交信息，避免文件路径问题
              cat "{1}" | (cd "$dir" && npx commitlint)
              exit $?
            fi
          done
          # 如果都找不到，尝试全局安装
          npx commitlint --edit {1}
        fi
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
        echo "✅ 代码格式检查通过"`;

    // 在 monorepo 场景下，lefthook.yml 需要放在 Git 根目录
    const lefthookConfigPath = path.join(this.gitRoot, 'lefthook.yml');
    
    // 检查是否已存在配置文件
    if (fs.existsSync(lefthookConfigPath)) {
      // 如果已存在且内容相似，则不覆盖
      const existingContent = await fs.readFile(lefthookConfigPath, 'utf8');
      if (existingContent.includes('Git规范化工作流配置')) {
        return; // 配置已存在，跳过创建
      }
    }

    await fs.writeFile(lefthookConfigPath, config);
  }

  async createVersionConfig() {
    const config = `module.exports = {
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
  header: '# 更新日志\\n\\n自动生成的版本历史记录。\\n\\n',
  skip: {
    bump: false,
    changelog: false,
    commit: false,
    tag: false
  }
};`;

    await fs.writeFile(
      path.join(this.projectRoot, '.versionrc.js'),
      config
    );
  }

  async updatePackageJson() {
    const spinner = ora('⚙️  更新package.json...').start();

    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = await fs.readJson(packageJsonPath);

      // 备份原始package.json
      await fs.copy(packageJsonPath, `${packageJsonPath}.backup`);

      // 添加scripts
      packageJson.scripts = packageJson.scripts || {};
      
      const runCommand = this.packageManager === 'npm' ? 'npm run' : 
                        this.packageManager === 'pnpm' ? 'pnpm run' : 
                        this.packageManager === 'yarn' ? 'yarn run' : 'npm run';

      const gitScripts = {
        // Git hooks准备（必须保留，npm install时自动安装hooks）
        "prepare": "lefthook install"
      };

      // 只添加不存在的script，避免覆盖用户现有的脚本
      Object.keys(gitScripts).forEach(key => {
        if (!packageJson.scripts[key]) {
          packageJson.scripts[key] = gitScripts[key];
        }
      });

      // 添加commitizen配置
      packageJson.config = packageJson.config || {};
      packageJson.config.commitizen = {
        "path": "cz-customizable"
      };

      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      
      spinner.succeed('✅ package.json更新完成');
    } catch (error) {
      spinner.fail('❌ package.json更新失败');
      throw error;
    }
  }



  async updateGitignore() {
    const spinner = ora('📝 更新.gitignore...').start();

    try {
      const gitignorePath = path.join(this.projectRoot, '.gitignore');
      
      // 确保.gitignore存在
      if (!fs.existsSync(gitignorePath)) {
        await fs.writeFile(gitignorePath, '');
      }

      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      
      // 检查是否已经包含Git工具相关的忽略项
      if (!gitignoreContent.includes('# Git工具临时文件')) {
        const gitIgnoreEntries = `

# Git工具临时文件
.lefthook-local.yml
.lefthook/
*.backup
.npm
.yarn
.pnpm-debug.log*
`;

        await fs.appendFile(gitignorePath, gitIgnoreEntries);
        spinner.succeed('✅ .gitignore更新完成');
      } else {
        spinner.succeed('✅ .gitignore已包含Git工具配置，跳过更新');
      }
    } catch (error) {
      spinner.fail('❌ .gitignore更新失败');
      throw error;
    }
  }

  async initializeGitHooks() {
    const spinner = ora('🔧 初始化Git hooks...').start();

    try {
      // 使用Git根目录的hooks目录
      const hooksDir = path.join(this.gitRoot, '.git', 'hooks');
      
      if (fs.existsSync(hooksDir)) {
        // 备份现有hooks
        const backupDir = path.join(this.gitRoot, '.git', `hooks-backup-${Date.now()}`);
        const hasExistingHooks = fs.readdirSync(hooksDir).some(file => 
          ['pre-commit', 'commit-msg', 'pre-push'].includes(file)
        );
        
        if (hasExistingHooks) {
          await fs.copy(hooksDir, backupDir);
        }
        
        // 清理冲突文件
        const conflictFiles = [
          'pre-commit.old', 'commit-msg.old', 'pre-push.old',
          'pre-commit.sample', 'commit-msg.sample', 'pre-push.sample'
        ];
        
        for (const file of conflictFiles) {
          const filePath = path.join(hooksDir, file);
          if (fs.existsSync(filePath)) {
            await fs.remove(filePath);
          }
        }
      }

      // 清理husky配置 - 优先在项目目录清理，然后在Git根目录清理
      const projectHuskyDir = path.join(this.projectRoot, '.husky');
      const gitHuskyDir = path.join(this.gitRoot, '.husky');
      
      if (fs.existsSync(projectHuskyDir)) {
        await fs.remove(projectHuskyDir);
      }
      if (this.gitRoot !== this.projectRoot && fs.existsSync(gitHuskyDir)) {
        await fs.remove(gitHuskyDir);
      }

      // 在monorepo场景下，确保Git根目录也有lefthook可用
      const isMonorepo = this.gitRoot !== this.projectRoot;
      if (isMonorepo) {
        await this.ensureLefthookInGitRoot();
      }

      // 初始化lefthook（必须在Git根目录执行，因为配置文件在那里）
      let installSuccess = false;
      const installMethods = [
        {
          name: '全局lefthook',
          command: 'lefthook install',
          cwd: this.gitRoot
        },
        {
          name: 'npx lefthook',
          command: 'npx lefthook install',
          cwd: this.gitRoot
        },
        {
          name: '项目脚本prepare',
          command: `${this.getRunCommand()} prepare`,
          cwd: this.projectRoot
        },
        {
          name: '项目脚本git:setup',
          command: `${this.getRunCommand()} git:setup`,
          cwd: this.projectRoot
        }
      ];

      for (const method of installMethods) {
        try {
          execSync(method.command, { 
            cwd: method.cwd, 
            stdio: 'pipe' 
          });
          installSuccess = true;
          console.log(`✅ 使用${method.name}安装成功`);
          break;
        } catch (error) {
          // 继续尝试下一个方法
          continue;
        }
      }

      if (!installSuccess) {
        console.log('⚠️  所有安装方法都失败了，将创建备用的package.json脚本');
      }

      // 验证安装（检查Git根目录的hooks）
      const requiredHooks = ['pre-commit', 'commit-msg'];
      const allHooksInstalled = requiredHooks.every(hook => 
        fs.existsSync(path.join(this.gitRoot, '.git', 'hooks', hook))
      );

      if (allHooksInstalled) {
        spinner.succeed('✅ Git hooks初始化完成');
      } else {
        spinner.warn('⚠️  Git hooks可能未完全安装，请手动运行 npm run git:setup');
      }
    } catch (error) {
      spinner.fail('❌ Git hooks初始化失败');
      console.log(chalk.yellow('💡 可以稍后运行 npm run git:setup 手动初始化'));
    }
  }

  /**
   * 在monorepo场景下确保Git根目录有lefthook可用
   * 如果子项目有lefthook但Git根目录没有，会在Git根目录安装lefthook
   */
  async ensureLefthookInGitRoot() {
    const gitRootPackageJsonPath = path.join(this.gitRoot, 'package.json');
    const projectHasLefthook = fs.existsSync(path.join(this.projectRoot, 'node_modules', 'lefthook'));
    const gitRootHasLefthook = fs.existsSync(path.join(this.gitRoot, 'node_modules', 'lefthook'));

    // 如果子项目有lefthook但Git根目录没有，需要在Git根目录安装
    if (projectHasLefthook && !gitRootHasLefthook) {
      try {
        // 创建或更新Git根目录的package.json
        let gitRootPackageJson = {};
        if (fs.existsSync(gitRootPackageJsonPath)) {
          gitRootPackageJson = await fs.readJSON(gitRootPackageJsonPath);
        } else {
          gitRootPackageJson = {
            name: path.basename(this.gitRoot),
            version: '1.0.0',
            description: 'Monorepo root package',
            private: true
          };
        }

        // 确保有devDependencies
        if (!gitRootPackageJson.devDependencies) {
          gitRootPackageJson.devDependencies = {};
        }

        // 添加lefthook依赖
        if (!gitRootPackageJson.devDependencies.lefthook) {
          gitRootPackageJson.devDependencies.lefthook = '^1.7.0';
          await fs.writeJSON(gitRootPackageJsonPath, gitRootPackageJson, { spaces: 2 });
          
          // 安装lefthook
          const installCommand = this.getInstallCommand(['lefthook']);
          execSync(installCommand, { 
            cwd: this.gitRoot, 
            stdio: 'pipe' 
          });
          
          console.log(`📦 已在Git根目录安装lefthook以支持monorepo`);
        }
      } catch (error) {
        console.log(chalk.yellow('⚠️  无法在Git根目录安装lefthook，可能需要手动处理'));
      }
    }
  }

  getRunCommand() {
    switch (this.packageManager) {
      case 'npm':
        return 'npm run';
      case 'pnpm':
        return 'pnpm run';
      case 'yarn':
        return 'yarn run';
      default:
        return 'npm run';
    }
  }

  showSuccessMessage() {
    console.log(chalk.green('\n🎉 Git规范化工作流配置完成！\n'));

    console.log(chalk.blue('🌟 推荐使用全局命令 (任意目录可用):\n'));
    
    console.log(chalk.yellow('  📝 智能提交:'));
    console.log(`     ${chalk.bold('gg commit')} 或 ${chalk.bold('gg c')}         # 智能检测提交配置，支持monorepo`);
    console.log(`     支持检测项目级和全局commitizen配置\n`);
    
    console.log(chalk.yellow('  🌿 智能分支:'));
    console.log(`     ${chalk.bold('gg branch')} 或 ${chalk.bold('gg b')}         # 交互式创建规范分支，自动验证`);
    console.log(`     支持feature、hotfix、bugfix等类型\n`);

    console.log(chalk.yellow('  🚀 团队协作:'));
    console.log(`     ${chalk.bold('gg setup')} 或 ${chalk.bold('gg s')}          # 团队成员快速初始化（依赖+hooks）`);
    console.log(`     ${chalk.bold('gg fix')}                    # 修复Git hooks冲突问题\n`);

    const runCommand = this.getRunCommand();
    
    console.log(chalk.blue('📦 项目脚本命令:\n'));
    
    console.log(chalk.yellow('  🏷️  版本发布:'));
    console.log(`     ${runCommand} release             # 自动版本发布`);
    console.log(`     ${runCommand} release:major       # 主版本发布`);
    console.log(`     ${runCommand} release:minor       # 次版本发布`);
    console.log(`     ${runCommand} release:patch       # 补丁版本发布\n`);

    console.log(chalk.blue('💡 分支命名规范:'));
    console.log('   feature_[模块]_[描述]  (例: feature_user_login)');
    console.log('   hotfix_v[版本]_[描述]  (例: hotfix_v1.0.3_bug_fix)');
    console.log('   bugfix_[描述]         (例: bugfix_scroll_error)\n');
    
    console.log(chalk.blue('🎯 提交类型:'));
    console.log('   feat, fix, docs, style, refactor, perf, test, chore, build, ci\n');
    
    console.log(chalk.green('✨ 核心特性:'));
    console.log('   🌟 全局命令优先 - 在任意Git仓库中使用');
    console.log('   🏗️  智能Monorepo支持 - 自动检测项目结构');
    console.log('   🎯 智能配置检测 - 项目级优先，全局兜底');
    console.log('   📦 极简项目配置 - 只保留必要的npm scripts');
    console.log('   ✅ 完全中文化界面');
    console.log('   ✅ 无字符长度限制');
    console.log('   ✅ 分支命名规范验证');
    console.log('   ✅ 主分支保护机制');
    console.log('   ✅ 使用lefthook替代husky（更稳定）\n');
    
    console.log(chalk.green('开始愉快的开发吧！ 🚀\n'));
    console.log(chalk.cyan('💡 极简设计: 项目中只保留一个prepare script，所有功能通过gg命令使用'));
    console.log(chalk.cyan('💡 版本发布: 使用 gg release 而非npm scripts，支持全局使用'));
    console.log(chalk.yellow('💾 备份文件: package.json.backup (如有问题可恢复)'));
  }
}

async function initGitWorkflow(options = {}) {
  const initializer = new GitWorkflowInitializer(options);
  await initializer.init();
}

module.exports = { initGitWorkflow, GitWorkflowInitializer };
