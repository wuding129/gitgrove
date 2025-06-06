const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { execSync } = require('child_process');

class SetupManager {
  constructor() {
    this.currentDir = process.cwd();
  }

  /**
   * 检测包管理器
   */
  detectPackageManager() {
    if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
    if (fs.existsSync('yarn.lock')) return 'yarn';
    if (fs.existsSync('package-lock.json')) return 'npm';
    return 'npm'; // 默认
  }

  /**
   * 检查是否在项目根目录
   */
  checkProjectRoot() {
    if (!fs.existsSync('package.json')) {
      console.log(chalk.red('❌ 错误: 请在项目根目录运行此命令'));
      process.exit(1);
    }
  }

  /**
   * 检查是否已配置Git工作流
   */
  checkGitWorkflowConfig() {
    if (!fs.existsSync('lefthook.yml') || !fs.existsSync('commitlint.config.js')) {
      console.log(chalk.red('❌ 错误: 项目未配置Git工作流'));
      console.log(chalk.yellow('请先运行: gg init 或 gitgrove init'));
      process.exit(1);
    }
  }

  /**
   * 安装项目依赖
   */
  async installDependencies() {
    const packageManager = this.detectPackageManager();
    const spinner = ora(chalk.blue('📦 安装项目依赖...')).start();

    try {
      const installCommand = packageManager === 'yarn' ? 'yarn install' : `${packageManager} install`;
      execSync(installCommand, { stdio: 'inherit' });
      spinner.succeed(chalk.green('✅ 依赖安装完成'));
    } catch (error) {
      spinner.fail(chalk.red('❌ 依赖安装失败'));
      throw error;
    }
  }

  /**
   * 配置Git hooks
   */
  async setupGitHooks() {
    const spinner = ora(chalk.blue('🔧 配置Git hooks...')).start();

    try {
      execSync('lefthook install', { stdio: 'inherit' });
      spinner.succeed(chalk.green('✅ Git hooks配置完成'));
    } catch (error) {
      spinner.fail(chalk.red('❌ Git hooks配置失败'));
      throw error;
    }
  }

  /**
   * 配置Git用户信息（如果未配置）
   */
  async configureGitUser() {
    const spinner = ora(chalk.blue('👤 检查Git用户配置...')).start();

    try {
      // 检查是否已配置用户名和邮箱
      let userName, userEmail;
      
      try {
        userName = execSync('git config user.name', { encoding: 'utf8' }).trim();
      } catch (e) {
        userName = null;
      }
      
      try {
        userEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
      } catch (e) {
        userEmail = null;
      }

      if (userName && userEmail) {
        spinner.succeed(chalk.green(`✅ Git用户已配置: ${userName} <${userEmail}>`));
      } else {
        spinner.warn(chalk.yellow('⚠️  Git用户信息未完整配置'));
        console.log(chalk.blue('请配置Git用户信息:'));
        if (!userName) {
          console.log(chalk.gray('  git config user.name "你的姓名"'));
        }
        if (!userEmail) {
          console.log(chalk.gray('  git config user.email "你的邮箱"'));
        }
      }
    } catch (error) {
      spinner.fail(chalk.red('❌ Git用户配置检查失败'));
      throw error;
    }
  }

  /**
   * 显示团队协作指南
   */
  showTeamGuide() {
    console.log(chalk.green('\n🎉 团队成员初始化完成！\n'));
    
    console.log(chalk.blue('📋 团队协作指南:\n'));
    
    console.log(chalk.yellow('  🔄 开发流程:'));
    console.log(`     1. 创建分支: ${chalk.bold('gg branch')} 或 ${chalk.bold('gg b')}`);
    console.log(`     2. 开发代码...`);
    console.log(`     3. 提交代码: ${chalk.bold('gg commit')} 或 ${chalk.bold('gg c')}`);
    console.log(`     4. 推送分支: git push origin [分支名]`);
    console.log(`     5. 创建PR/MR\n`);
    
    console.log(chalk.yellow('  📝 提交规范:'));
    console.log('     feat: 新功能');
    console.log('     fix: 修复问题');
    console.log('     docs: 文档更新');
    console.log('     style: 代码格式');
    console.log('     refactor: 重构');
    console.log('     perf: 性能优化');
    console.log('     test: 测试相关');
    console.log('     chore: 构建/工具\n');
    
    console.log(chalk.yellow('  🌿 分支规范:'));
    console.log('     feature_[模块]_[描述]  (例: feature_user_login)');
    console.log('     hotfix_v[版本]_[描述]  (例: hotfix_v1.0.3_bug_fix)');
    console.log('     bugfix_[描述]         (例: bugfix_scroll_error)\n');
    
    console.log(chalk.green('开始愉快的团队协作吧！ 🚀'));
  }

  /**
   * 执行团队成员快速初始化
   */
  async setup() {
    try {
      console.log(chalk.blue('🚀 Git工作流快速初始化'));
      console.log('======================\n');

      // 1. 检查项目环境
      this.checkProjectRoot();
      this.checkGitWorkflowConfig();

      // 2. 安装依赖
      await this.installDependencies();

      // 3. 配置Git hooks
      await this.setupGitHooks();

      // 4. 检查Git用户配置
      await this.configureGitUser();

      // 5. 显示指南
      this.showTeamGuide();

    } catch (error) {
      console.error(chalk.red('\n❌ 初始化失败:'), error.message);
      process.exit(1);
    }
  }
}

module.exports = { SetupManager };