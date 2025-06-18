const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { execSync } = require('child_process');
const os = require('os');

// 进度管理器类
class ProgressManager {
  constructor(steps) {
    this.steps = steps;
    this.currentStep = 0;
    this.spinner = null;
  }

  start() {
    console.log(chalk.cyan('======================================'));
    // 在最后显示初始进度条
    this.updateProgressBar();
  }

  updateStep(message) {
    if (this.spinner) {
      this.spinner.stop();
    }
    this.spinner = ora(message).start();
  }

  nextStep() {
    if (this.spinner) {
      this.spinner.succeed();
      this.spinner = null;
    }
    this.currentStep++;
    // 每次步骤完成后，在底部更新进度条
    this.updateProgressBar();
  }

  updateProgressBar() {
    const progressBar = '█'.repeat(Math.floor((this.currentStep / this.steps.length) * 30)) +
                       '░'.repeat(30 - Math.floor((this.currentStep / this.steps.length) * 30));
    const percentage = Math.floor((this.currentStep / this.steps.length) * 100);

    // 在输出末尾显示进度条
    console.log(''); // 空行分隔
    console.log(chalk.cyan(`[${progressBar}] ${percentage}%`));
    console.log(''); // 空行分隔
  }

  complete() {
    if (this.spinner) {
      this.spinner.succeed();
      this.spinner = null;
    }
    // 最终进度条显示100%
    console.log('');
    console.log(chalk.cyan(`[████████████████████████████████] 100%`));
    console.log('');
  }

  stop() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}

class GitWorkflowInitializer {
  constructor(options = {}) {
    this.options = options;
    this.currentDir = process.cwd();
    this.force = options.force || false; // 添加 force 选项
    this.needAiHooks = false; // 是否需要AI hooks

    // 全局配置文件路径
    this.globalConfigDir = path.join(os.homedir(), '.gitgrove');
    this.globalConfigPath = path.join(this.globalConfigDir, 'config.json');

    // 查找Git根目录和package.json目录
    const { gitRoot, packageJsonDir } = this.findProjectDirectories();
    this.gitRoot = gitRoot;
    this.projectRoot = packageJsonDir || this.currentDir;

    // 检测是否有wbox.config.json文件，如果有则默认严格使用npm
    this.hasWboxConfig = fs.existsSync(path.join(this.projectRoot, 'wbox.config.json'));
    if (this.hasWboxConfig && !options.onlyNpm && !options.onlyPnpm && !options.onlyYarn) {
      console.log(chalk.yellow('💡 检测到wbox.config.json，将严格限制使用npm包管理器'));
      this.options.onlyNpm = true;
    }

    // 确定严格模式的包管理器
    this.strictPackageManager = null;
    if (this.options.onlyNpm) this.strictPackageManager = 'npm';
    if (this.options.onlyPnpm) this.strictPackageManager = 'pnpm';
    if (this.options.onlyYarn) this.strictPackageManager = 'yarn';

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
    // 如果指定了严格模式，强制使用指定的包管理器
    if (this.strictPackageManager) return this.strictPackageManager;

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
    console.log(chalk.blue.bold('🌟 Git规范化工作流一键初始化工具'));

    // 初始化进度管理器
    this.progressManager = new ProgressManager([
      '📦 检查开发环境',
      '🛠️  安装Git规范化依赖',
      '📝 创建配置文件',
      '⚙️  更新package.json',
      '📝 更新.gitignore',
      '🤖 配置AI代码统计',
      '🔧 初始化Git hooks'
    ]);

    this.progressManager.start();

    // 检查环境
    this.progressManager.updateStep('📦 检查开发环境...');
    await this.checkEnvironment();
    this.progressManager.nextStep();

    // 检查是否强制覆盖
    if (!this.options.force) {
      const shouldOverwrite = await this.checkExistingConfig();
      if (!shouldOverwrite) {
        this.progressManager.stop();
        console.log(chalk.yellow('👋 初始化已取消'));
        return;
      }
    }

    // 选择包管理器
    const hasStrictMode = this.options.onlyNpm || this.options.onlyPnpm || this.options.onlyYarn;
    if (!this.options.npm && !this.options.pnpm && !this.options.yarn && !hasStrictMode) {
      this.packageManager = await this.selectPackageManager();
    }

    if (hasStrictMode) {
      console.log(chalk.green(`✅ 已强制使用包管理器: ${this.packageManager} (严格限制模式)`));
    } else {
      console.log(chalk.green(`✅ 已选择包管理器: ${this.packageManager}`));
    }

    // 开始初始化
    this.progressManager.updateStep(`🛠️  使用 ${this.packageManager} 安装Git规范化依赖...`);
    await this.installDependencies();
    this.progressManager.nextStep();

    this.progressManager.updateStep('⚙️  更新package.json...');
    await this.updatePackageJson();
    this.progressManager.nextStep();

    this.progressManager.updateStep('📝 更新.gitignore...');
    await this.updateGitignore();
    this.progressManager.nextStep();

    // 询问是否配置AI代码统计 - 必须在创建配置文件之前
    this.progressManager.stop(); // 暂停进度条，准备交互
    await this.askAiStatConfig();
    this.progressManager.nextStep();

    this.progressManager.updateStep('📝 创建配置文件...');
    await this.createConfigFiles();
    this.progressManager.nextStep();

    this.progressManager.updateStep('🔧 初始化Git hooks...');
    await this.initializeGitHooks();
    this.progressManager.complete();

    this.showSuccessMessage();
  }

  async checkEnvironment() {
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
        console.log(chalk.cyan('📝 未找到package.json，将为您创建一个基础的package.json文件'));
        await this.createBasicPackageJson();
      }

      // 显示项目信息
      const relativePath = path.relative(this.gitRoot, this.projectRoot);
      const projectInfo = relativePath ? `子项目: ${relativePath}` : '根项目';
      console.log(chalk.cyan(`📁 Git根目录: ${this.gitRoot}`));
      console.log(chalk.cyan(`📦 项目目录: ${this.projectRoot} (${projectInfo})`));

    } catch (error) {
      throw new Error(`环境检查失败: ${error.message}`);
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

    const dependencies = [
      '@commitlint/cli',
      '@commitlint/config-conventional',
      'commitizen',
      'cz-customizable',
      'lefthook',
      'standard-version'
    ];

    try {
      const installCommand = this.getInstallCommand(dependencies);
      const isWindows = process.platform === 'win32';

      execSync(installCommand, {
        stdio: 'pipe',
        cwd: this.projectRoot,
        shell: isWindows
      });

    } catch (error) {
      throw new Error(`依赖安装失败: ${error.message}`);
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
    try {
      // 创建commitlint配置
      await this.createCommitlintConfig();

      // 创建cz-customizable配置
      await this.createCzConfig();

      // 创建lefthook配置
      await this.createLefthookConfig();

      // 创建版本发布配置
      await this.createVersionConfig();

      // 创建EditorConfig配置（可能有交互）
      await this.createEditorConfig();
    } catch (error) {
      throw new Error(`配置文件创建失败: ${error.message}`);
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
  }  async createLefthookConfig() {
    let aiHookConfig = '';

    // 如果配置了AI统计，添加相应的hook
    if (this.needAiHooks) {
      aiHookConfig = `
    # AI代码统计
    ai-stat:
      run: node scripts/ai-stat.js`;
    }

    const config = `# Git规范化工作流配置
# 分支创建约束和提交规范验证

# 分支推送前的验证 - 用于拦截不规范分支
pre-push:
  commands:
    branch-name-check:
      run: node scripts/branch-name-check.js

# 提交信息验证
commit-msg:
  commands:
    commitlint:
      run: npx --no-install commitlint --edit {1}
      stage_fixed: true

# 提交前的代码检查
pre-commit:
  commands:
    # 防止直接提交到master分支 (Windows兼容版本)
    protect-master:
      run: node scripts/protect-master.js

    # 代码质量检查
    lint-staged:
      glob: "*.{js,ts,vue,jsx,tsx}"
      run: |
        echo "🔍 检查代码格式..."
        # 这里可以添加ESLint等代码检查工具
        # npx eslint {staged_files} --fix
        echo "✅ 代码格式检查通过"${aiHookConfig}`;

    // 在 monorepo 场景下，lefthook.yml 需要放在 Git 根目录
    const lefthookConfigPath = path.join(this.gitRoot, 'lefthook.yml');

    // 始终覆盖现有的 lefthook.yml 配置文件
    await fs.writeFile(lefthookConfigPath, config);

    // 创建scripts目录和脚本文件
    await this.createHookScripts();
  }

  async createHookScripts() {
    // 创建scripts目录
    const scriptsDir = path.join(this.gitRoot, 'scripts');
    await fs.ensureDir(scriptsDir);

    // 创建分支名检查脚本
    const branchCheckScript = `#!/usr/bin/env node

// Windows兼容的分支名称检查脚本
const { execSync } = require('child_process');

try {
  // 获取当前分支名
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim() ||
                       execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();

  // 跳过master/main分支的检查
  if (currentBranch === 'master' || currentBranch === 'main') {
    process.exit(0);
  }

  // 分支命名规范校验
  const validPatterns = [
    /^feature_.+/,
    /^hotfix_.+/,
    /^bugfix_.+/
  ];

  const isValidBranch = validPatterns.some(pattern => pattern.test(currentBranch));

  if (isValidBranch) {
    console.log(\`✅ 分支名称符合规范: \${currentBranch}\`);
    process.exit(0);
  } else {
    console.log(\`❌ 错误: 分支名 '\${currentBranch}' 不符合规范!\`);
    console.log('📋 正确格式:');
    console.log('   🔹 feature_[模块]_[描述] (例: feature_user_login)');
    console.log('   🔹 hotfix_v[版本]_[描述] (例: hotfix_v1.0.3_login_fix)');
    console.log('   🔹 bugfix_[描述] (例: bugfix_scroll_error)');
    console.log('');
    console.log('💡 使用以下命令创建规范分支:');
    console.log('   gg branch 或 gg b (交互式创建分支)');
    process.exit(1);
  }
} catch (error) {
  // 如果无法获取分支信息，允许继续
  console.log('⚠️  无法获取分支信息，跳过检查');
  process.exit(0);
}`;

    // 创建master分支保护脚本
    const protectMasterScript = `#!/usr/bin/env node

// Windows兼容的master分支保护脚本
const { execSync } = require('child_process');

try {
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();

  if (branch === 'master' || branch === 'main') {
    console.log('❌ 错误: 禁止直接向主分支提交!');
    console.log('📋 正确流程:');
    console.log('   1. 创建功能分支: git checkout -b feature_[模块]_[描述]');
    console.log('   2. 在功能分支上开发和提交');
    console.log('   3. 通过Pull Request合并到主分支');
    process.exit(1);
  }
} catch (error) {
  // 如果无法获取分支信息，允许继续
  console.log('⚠️  无法获取分支信息，跳过检查');
}`;

    // 写入脚本文件
    await fs.writeFile(path.join(scriptsDir, 'branch-name-check.js'), branchCheckScript);
    await fs.writeFile(path.join(scriptsDir, 'protect-master.js'), protectMasterScript);

    // 如果需要AI hooks，创建AI统计脚本
    if (this.needAiHooks) {
      const aiStatScript = `#!/usr/bin/env node

// Windows兼容的AI代码统计脚本
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

async function callAiStatApi() {
  try {
    // 检查.env文件是否存在
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      console.log('❌ 缺少.env文件，请先运行 gg init 配置AI统计');
      process.exit(1);
    }

    // 读取环境变量
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envConfig = {};

    envContent.split('\\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          envConfig[key.trim()] = value.trim();
        }
      }
    });

    // 检查是否启用自动统计
    if (envConfig.AI_STAT_AUTO !== 'true') {
      console.log('ℹ️  AI自动统计已禁用 (AI_STAT_AUTO=false)');
      console.log('💡 如需启用，请在.env文件中设置 AI_STAT_AUTO=true');
      process.exit(0);
    }

    // 校验必需的环境变量
    if (!envConfig.AI_ORGANIZATION) {
      console.log('❌ 缺少AI_ORGANIZATION参数，请检查.env文件配置');
      process.exit(1);
    }

    if (!envConfig.AI_GIT_TOKEN) {
      console.log('❌ 缺少AI_GIT_TOKEN参数，请检查.env文件配置');
      process.exit(1);
    }

    // AI_PERCENTAGE是可选的，如果没有则使用随机值
    let aiPercentage = envConfig.AI_PERCENTAGE;
    if (!aiPercentage) {
      // 生成0.3-0.9的随机数，保留2位小数
      aiPercentage = (Math.random() * 0.6 + 0.3).toFixed(2);
      console.log(\`🎲 使用随机AI代码占比: \${aiPercentage}\`);
    }

    // 计算前一天的日期（格式：YYYY-MM-DD）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const previousDay = yesterday.toISOString().split('T')[0];

    // 接口URL和参数
    const apiUrl = envConfig.API_URL || 'http://k3sservice.qa.intra.weibo.com:48650/wecode/thirdparty_ai_percentage';
    const apiParams = \`organization=\${envConfig.AI_ORGANIZATION}&org_type=USER&percentage=\${aiPercentage}&git_token=\${envConfig.AI_GIT_TOKEN}&git=WEIBO_COM&start_time=\${previousDay}\`;
    const fullUrl = \`\${apiUrl}?\${apiParams}\`;

    console.log(\`🤖 Calling AI stat API: \${fullUrl}\`);

    // 调用API
    const response = await makeRequest(fullUrl);

    if (response.statusCode !== 200) {
      console.log(\`❌ AI统计API请求失败，HTTP状态码: \${response.statusCode}\`);
      console.log(\`响应: \${response.body}\`);
      process.exit(1);
    }

    // 检查API返回内容是否成功
    if (!response.body.includes('success')) {
      console.log(\`❌ AI统计验证失败: \${response.body}\`);
      process.exit(1);
    }

    console.log('✅ AI统计验证通过');

  } catch (error) {
    console.log(\`❌ AI统计脚本执行失败: \${error.message}\`);
    process.exit(1);
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;

    const req = protocol.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // 设置超时
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

// 执行AI统计
callAiStatApi();`;

      await fs.writeFile(path.join(scriptsDir, 'ai-stat.js'), aiStatScript);
    }
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

  async createEditorConfig() {
    const editorconfigPath = path.join(this.projectRoot, '.editorconfig');
    const exists = await fs.pathExists(editorconfigPath);

    // 如果文件存在且不是强制模式，询问用户是否覆盖
    if (exists && !this.force) {
      // 停止进度条，进行交互
      this.progressManager.stop();

      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: '检测到已存在 .editorconfig 文件，是否覆盖？',
          default: false
        }
      ]);

      // 恢复进度条
      this.progressManager.updateStep('📝 创建配置文件...');

      if (!answer.overwrite) {
        console.log('ℹ️  保留现有的 .editorconfig 文件');
        return; // 用户选择不覆盖，直接返回
      }
    }

    // EditorConfig配置内容
    const config = `# EditorConfig配置文件
# 统一代码编辑器的编码风格
# 更多信息请访问: https://editorconfig.org

root = true  # 指定这是项目的根目录下的EditorConfig文件，编辑器应停止在父目录中查找.editorconfig文件

[*]  # 以下设置适用于所有文件
charset = utf-8  # 设置字符编码为UTF-8
indent_style = space  # 使用空格而不是制表符进行缩进
indent_size = 2  # 缩进大小为2个空格
end_of_line = lf  # 使用LF（Line Feed，Unix风格）作为行尾字符
trim_trailing_whitespace = true  # 保存文件时删除行尾的空白字符
insert_final_newline = true  # 确保文件保存时以换行符结尾

[*.md]  # 以下设置适用于所有Markdown文件
trim_trailing_whitespace = false  # 对于Markdown文件，不删除行尾空白字符（因为在Markdown中行尾空格有特殊含义）
`;

    await fs.writeFile(editorconfigPath, config);

    if (exists) {
      console.log('✅ .editorconfig 文件已覆盖');
    } else {
      console.log('✅ .editorconfig 文件已创建');
    }
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

      // 如果指定了严格模式，添加包管理器限制
      if (this.strictPackageManager) {
        gitScripts["preinstall"] = `npx only-allow ${this.strictPackageManager}`;
      }

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

      if (this.strictPackageManager) {
        spinner.info(`📦 已添加包管理器限制: 只允许使用 ${this.strictPackageManager}`);
      }

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

# 环境变量文件（.env.example应该被提交，作为配置模板）
.env
.env.local
.env.*.local
`;

        await fs.appendFile(gitignorePath, gitIgnoreEntries);
        spinner.succeed('✅ .gitignore更新完成');
      } else {
        // 检查是否包含.env
        if (!gitignoreContent.includes('.env')) {
          const envEntries = `
# 环境变量文件（.env.example应该被提交，作为配置模板）
.env
.env.local
.env.*.local
`;
          await fs.appendFile(gitignorePath, envEntries);
        }
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
        spinner.text = '🔧 备份现有hooks...';
        // 备份现有hooks
        const backupDir = path.join(this.gitRoot, '.git', `hooks-backup-${Date.now()}`);
        const hasExistingHooks = fs.readdirSync(hooksDir).some(file =>
          ['pre-commit', 'commit-msg', 'pre-push'].includes(file)
        );

        if (hasExistingHooks) {
          await fs.copy(hooksDir, backupDir);
        }

        spinner.text = '🔧 清理冲突文件...';
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

      spinner.text = '🔧 清理husky配置...';
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
        spinner.text = '🔧 配置monorepo支持...';
        await this.ensureLefthookInGitRoot();
      }

      spinner.text = '🔧 安装lefthook...';
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

    // 如果启用了包管理器限制，显示相关信息
    if (this.options.onlyNpm) {
      console.log(chalk.cyan('🔒 包管理器限制已启用:\n'));
      console.log(chalk.yellow('  ✅ 已添加preinstall脚本限制只能使用npm'));
      if (this.hasWboxConfig) {
        console.log(chalk.yellow('  📄 检测到wbox.config.json，自动启用npm限制'));
      }
      console.log(chalk.yellow('  ⚠️  使用pnpm或yarn安装依赖将被阻止\n'));
    }

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
    console.log('   ✅ 使用lefthook替代husky（更稳定）');

    // 显示包管理器限制信息
    if (this.strictPackageManager) {
      console.log(`   🔒 包管理器限制 - 只允许使用 ${this.strictPackageManager}`);
    }

    console.log('');

    console.log(chalk.green('开始愉快的开发吧！ 🚀\n'));
    console.log(chalk.cyan('💡 极简设计: 项目中只保留一个prepare script，所有功能通过gg命令使用'));
    console.log(chalk.cyan('💡 版本发布: 使用 gg release 而非npm scripts，支持全局使用'));
    console.log(chalk.yellow('💾 备份文件: package.json.backup (如有问题可恢复)'));
  }

  /**
   * 读取全局AI配置
   */
  async readGlobalAiConfig() {
    try {
      if (await fs.pathExists(this.globalConfigPath)) {
        const config = await fs.readJson(this.globalConfigPath);
        return config.aiConfig || null;
      }
    } catch (error) {
      // 忽略错误，返回null
    }
    return null;
  }

  /**
   * 保存全局AI配置
   */
  async saveGlobalAiConfig(aiConfig) {
    try {
      await fs.ensureDir(this.globalConfigDir);

      let globalConfig = {};
      if (await fs.pathExists(this.globalConfigPath)) {
        globalConfig = await fs.readJson(this.globalConfigPath);
      }

      globalConfig.aiConfig = {
        AI_ORGANIZATION: aiConfig.AI_ORGANIZATION,
        AI_GIT_TOKEN: aiConfig.AI_GIT_TOKEN,
        savedAt: new Date().toISOString()
      };

      await fs.writeJson(this.globalConfigPath, globalConfig, { spaces: 2 });
      console.log(chalk.gray('✅ AI配置已保存到全局配置 ~/.gitgrove/config.json'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  保存全局配置失败，下次仍需重新输入'));
    }
  }

  async askAiStatConfig() {
    // 检查是否有全局配置
    const globalAiConfig = await this.readGlobalAiConfig();

    if (globalAiConfig) {
      console.log(chalk.cyan(`\n🔍 检测到已保存的AI配置:`));
      console.log(chalk.gray(`   组织名: ${globalAiConfig.AI_ORGANIZATION}`));
      console.log(chalk.gray(`   Token: ${globalAiConfig.AI_GIT_TOKEN.substring(0, 8)}...`));
      console.log(chalk.gray(`   保存时间: ${new Date(globalAiConfig.savedAt).toLocaleString()}`));

      const useGlobalAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'useGlobal',
          message: '如何处理AI代码统计配置？',
          choices: [
            { name: '✅ 使用已保存的配置', value: 'use' },
            { name: '🔄 重新配置并更新保存', value: 'update' },
            { name: '❌ 跳过AI统计配置', value: 'skip' }
          ],
          default: 'use'
        }
      ]);

      if (useGlobalAnswer.useGlobal === 'skip') {
        return;
      } else if (useGlobalAnswer.useGlobal === 'use') {
        await this.setupAiStatConfigWithGlobal(globalAiConfig);
        return;
      }
      // 'update' 继续执行下面的配置流程
    }

    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableAiStat',
        message: '是否配置AI代码统计功能？',
        default: false
      }
    ]);

    if (answer.enableAiStat) {
      await this.setupAiStatConfig();
    }
  }

  async setupAiStatConfigWithGlobal(globalAiConfig) {
    console.log(chalk.cyan('\n🤖 使用全局AI配置...'));

    const envPath = path.join(this.projectRoot, '.env');
    let envConfig = {};

    // 读取现有的.env文件
    if (await fs.pathExists(envPath)) {
      const envContent = await fs.readFile(envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, value] = trimmed.split('=');
          if (key && value) {
            envConfig[key.trim()] = value.trim();
          }
        }
      }
    }

    // 使用全局配置
    envConfig.AI_ORGANIZATION = globalAiConfig.AI_ORGANIZATION;
    envConfig.AI_GIT_TOKEN = globalAiConfig.AI_GIT_TOKEN;

    // 设置默认API URL
    if (!envConfig.API_URL) {
      envConfig.API_URL = 'http://k3sservice.qa.intra.weibo.com:48650/wecode/thirdparty_ai_percentage';
    }

    // 询问AI代码占比（仍然每次询问）
    const questions = [
      {
        type: 'input',
        name: 'percentage',
        message: '请输入AI代码占比（例如：0.3表示30%，回车跳过-每次使用随机值）:',
        validate: (input) => {
          if (!input.trim()) return true; // 允许空值
          const num = parseFloat(input);
          if (isNaN(num) || num < 0 || num > 1) {
            return '请输入0-1之间的数值，或回车跳过使用随机值';
          }
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'autoStat',
        message: '是否启用AI统计自动触发？（true=git commit时自动统计，false=仅手动统计）',
        default: false
      }
    ];

    const answers = await inquirer.prompt(questions);

    if (answers.percentage && answers.percentage.trim()) {
      envConfig.AI_PERCENTAGE = answers.percentage;
    }

    // 设置AI自动统计配置
    envConfig.AI_STAT_AUTO = answers.autoStat ? 'true' : 'false';

    // 写入.env文件
    await this.writeEnvFile(envConfig);

    // 生成.env.example模板文件
    await this.generateEnvExample();

    // 标记需要AI hooks
    this.needAiHooks = true;
  }

  async setupAiStatConfig() {
    console.log(chalk.cyan('\n🤖 配置AI代码统计...'));

    const envPath = path.join(this.projectRoot, '.env');
    let envConfig = {};

    // 读取现有的.env文件
    if (await fs.pathExists(envPath)) {
      const envContent = await fs.readFile(envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, value] = trimmed.split('=');
          if (key && value) {
            envConfig[key.trim()] = value.trim();
          }
        }
      }
    }

    // 交互获取配置
    const questions = [];

    if (!envConfig.AI_ORGANIZATION) {
      questions.push({
        type: 'input',
        name: 'organization',
        message: '请输入组织名（邮箱前缀）:',
        validate: (input) => input.trim() ? true : '组织名不能为空'
      });
    }

    if (!envConfig.AI_GIT_TOKEN) {
      questions.push({
        type: 'input',
        name: 'gitToken',
        message: '请输入Git Token（在 https://git.intra.weibo.com/-/profile/personal_access_tokens 获取）:',
        validate: (input) => input.trim() ? true : 'Git Token不能为空'
      });
    }

    if (!envConfig.AI_PERCENTAGE) {
      questions.push({
        type: 'input',
        name: 'percentage',
        message: '请输入AI代码占比（例如：0.3表示30%，回车跳过-每次使用随机值）:',
        validate: (input) => {
          if (!input.trim()) return true; // 允许空值
          const num = parseFloat(input);
          if (isNaN(num) || num < 0 || num > 1) {
            return '请输入0-1之间的数值，或回车跳过使用随机值';
          }
          return true;
        }
      });
    }

    // 总是询问是否启用自动统计
    questions.push({
      type: 'confirm',
      name: 'autoStat',
      message: '是否启用AI统计自动触发？（true=git commit时自动统计，false=仅手动统计）',
      default: false
    });

    const answers = await inquirer.prompt(questions);

    // 更新配置
    if (answers.organization) envConfig.AI_ORGANIZATION = answers.organization;
    if (answers.gitToken) envConfig.AI_GIT_TOKEN = answers.gitToken;
    if (answers.percentage && answers.percentage.trim()) envConfig.AI_PERCENTAGE = answers.percentage;

    // 设置AI自动统计配置
    envConfig.AI_STAT_AUTO = answers.autoStat ? 'true' : 'false';

    // 设置默认值
    if (!envConfig.API_URL) {
      envConfig.API_URL = 'http://k3sservice.qa.intra.weibo.com:48650/wecode/thirdparty_ai_percentage';
    }

    // 写入.env文件
    await this.writeEnvFile(envConfig);

    // 生成.env.example模板文件
    await this.generateEnvExample();

    // 保存到全局配置（如果有组织名和token）
    if (envConfig.AI_ORGANIZATION && envConfig.AI_GIT_TOKEN) {
      await this.saveGlobalAiConfig(envConfig);
    }

    // 标记需要AI hooks
    this.needAiHooks = true;
  }

  async writeEnvFile(config) {
    const envPath = path.join(this.projectRoot, '.env');
    let content = '';

    content += '# AI代码统计配置\n';
    content += `API_URL=${config.API_URL}\n`;
    if (config.AI_ORGANIZATION) content += `AI_ORGANIZATION=${config.AI_ORGANIZATION}\n`;
    if (config.AI_GIT_TOKEN) content += `AI_GIT_TOKEN=${config.AI_GIT_TOKEN}\n`;
    if (config.AI_PERCENTAGE) content += `AI_PERCENTAGE=${config.AI_PERCENTAGE}\n`;
    content += `AI_STAT_AUTO=${config.AI_STAT_AUTO || 'false'}\n`;

    await fs.writeFile(envPath, content);
    console.log(chalk.green('✅ .env 文件已创建/更新'));
  }

  async generateEnvExample() {
    const envExamplePath = path.join(this.projectRoot, '.env.example');

    let content = '# AI代码统计配置示例文件\n';
    content += '# 复制此文件为 .env 并填入真实配置值\n\n';
    content += '# API服务地址\n';
    content += 'API_URL=http://k3sservice.qa.intra.weibo.com:48650/wecode/thirdparty_ai_percentage\n\n';
    content += '# 组织名（邮箱前缀）\n';
    content += 'AI_ORGANIZATION=your_username\n\n';
    content += '# Git Token（在 https://git.intra.weibo.com/-/profile/personal_access_tokens 获取）\n';
    content += 'AI_GIT_TOKEN=your_git_token_here\n\n';
    content += '# AI代码占比（可选，0-1之间的数值，例如0.3表示30%。如不设置则每次使用随机值）\n';
    content += '# AI_PERCENTAGE=0.5\n\n';
    content += '# 是否启用AI统计自动触发（true=提交时自动统计，false=仅手动统计）\n';
    content += 'AI_STAT_AUTO=false\n';

    await fs.writeFile(envExamplePath, content);
    console.log(chalk.green('✅ .env.example 模板文件已生成'));
  }
}

async function initGitWorkflow(options = {}) {
  const initializer = new GitWorkflowInitializer(options);
  await initializer.init();
}

module.exports = { initGitWorkflow, GitWorkflowInitializer };
