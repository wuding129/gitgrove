const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { execSync } = require('child_process');

class ReleaseManager {
  constructor() {
    this.currentDir = process.cwd();
    const { gitRoot, projectRoot } = this.findProjectDirectories();
    this.gitRoot = gitRoot;
    this.projectRoot = projectRoot;
    this.packageManager = this.detectPackageManager();
  }

  /**
   * 查找项目目录结构
   */
  findProjectDirectories() {
    let currentDir = this.currentDir;
    let gitRoot = null;
    let projectRoot = null;

    // 从当前目录开始往上查找.git目录
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, '.git'))) {
        gitRoot = currentDir;
        break;
      }
      currentDir = path.dirname(currentDir);
    }

    // 从当前目录开始往上查找package.json
    currentDir = this.currentDir;
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        projectRoot = currentDir;
        break;
      }
      currentDir = path.dirname(currentDir);
    }

    return { gitRoot, projectRoot };
  }

  /**
   * 检测包管理器
   */
  detectPackageManager() {
    if (fs.existsSync(path.join(this.projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(this.projectRoot, 'yarn.lock'))) return 'yarn';
    return 'npm';
  }

  /**
   * 检查工作目录状态
   */
  checkWorkingDirectory() {
    try {
      const status = execSync('git status --porcelain', { 
        cwd: this.gitRoot,
        encoding: 'utf8' 
      });
      return status.trim() === '';
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查是否有标准版本配置
   */
  checkStandardVersionConfig() {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    try {
      const packageJson = fs.readJsonSync(packageJsonPath);
      
      // 检查是否有 standard-version 依赖（在 devDependencies 中）
      const hasStandardVersion = packageJson.devDependencies && 
        packageJson.devDependencies['standard-version'];
      
      // 检查是否有版本发布配置文件
      const hasVersionrcConfig = fs.existsSync(path.join(this.projectRoot, '.versionrc.js')) ||
        fs.existsSync(path.join(this.projectRoot, '.versionrc.json')) ||
        fs.existsSync(path.join(this.projectRoot, '.versionrc'));
      
      // 只要有 standard-version 依赖就认为配置正确
      // 因为我们现在通过全局命令使用，不再依赖 npm scripts
      return hasStandardVersion;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取当前版本
   */
  getCurrentVersion() {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = fs.readJsonSync(packageJsonPath);
      return packageJson.version || '0.0.0';
    } catch (error) {
      return '0.0.0';
    }
  }

  /**
   * 执行版本发布
   */
  async executeRelease(releaseType = null) {
    const spinner = ora('🚀 执行版本发布...').start();

    try {
      let command;
      
      // 直接使用 npx standard-version 而不依赖 npm scripts
      if (releaseType && releaseType !== 'auto') {
        command = `npx standard-version --release-as ${releaseType}`;
      } else {
        command = `npx standard-version`;
      }

      execSync(command, {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });

      spinner.succeed('✅ 版本发布完成');
      return true;
    } catch (error) {
      spinner.fail('❌ 版本发布失败');
      throw error;
    }
  }

  /**
   * 主发布流程
   */
  async release(options = {}) {
    console.log(chalk.cyan('\n🚀 版本发布管理'));
    console.log(chalk.cyan('==================\n'));

    // 基础检查
    if (!this.gitRoot) {
      console.log(chalk.red('❌ 错误: 当前目录不在Git仓库中'));
      return;
    }

    if (!this.projectRoot) {
      console.log(chalk.red('❌ 错误: 找不到package.json文件'));
      return;
    }

    // 显示项目信息
    console.log(chalk.blue(`📁 Git根目录: ${this.gitRoot}`));
    console.log(chalk.blue(`📦 项目目录: ${this.projectRoot}`));
    console.log(chalk.blue(`📋 包管理器: ${this.packageManager}`));
    console.log(chalk.blue(`📌 当前版本: ${this.getCurrentVersion()}`));
    console.log();

    // 检查是否配置了标准版本
    if (!this.checkStandardVersionConfig()) {
      console.log(chalk.red('❌ 错误: 项目未配置standard-version'));
      console.log(chalk.yellow('💡 请先运行: gg init 配置Git工作流'));
      return;
    }

    // 检查工作目录状态
    if (!this.checkWorkingDirectory()) {
      console.log(chalk.red('❌ 错误: 工作目录不干净，请先提交或暂存所有更改'));
      console.log(chalk.yellow('💡 使用 gg commit 提交更改'));
      return;
    }

    try {
      // 如果指定了版本类型选项，直接执行
      if (options.major) {
        console.log(chalk.green('🔢 执行主版本发布 (major)'));
        await this.executeRelease('major');
        return;
      }

      if (options.minor) {
        console.log(chalk.green('🔢 执行次版本发布 (minor)'));
        await this.executeRelease('minor');
        return;
      }

      if (options.patch) {
        console.log(chalk.green('🔢 执行补丁版本发布 (patch)'));
        await this.executeRelease('patch');
        return;
      }

      // 交互式选择版本类型
      const { releaseType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'releaseType',
          message: '选择版本发布类型:',
          choices: [
            {
              name: '🔧 补丁版本 (patch) - 修复bug，向后兼容',
              value: 'patch'
            },
            {
              name: '✨ 次版本 (minor) - 新功能，向后兼容',
              value: 'minor'
            },
            {
              name: '💥 主版本 (major) - 重大更改，不向后兼容',
              value: 'major'
            },
            {
              name: '📦 自动版本 (auto) - 根据提交信息自动判断',
              value: 'auto'
            }
          ]
        }
      ]);

      // 确认发布
      const currentVersion = this.getCurrentVersion();
      console.log(chalk.yellow(`\n当前版本: ${currentVersion}`));
      
      const { confirmRelease } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmRelease',
          message: `确认执行${releaseType === 'auto' ? '自动' : releaseType}版本发布？`,
          default: false
        }
      ]);

      if (!confirmRelease) {
        console.log(chalk.yellow('版本发布已取消'));
        return;
      }

      // 执行发布
      if (releaseType === 'auto') {
        await this.executeRelease();
      } else {
        await this.executeRelease(releaseType);
      }

      console.log(chalk.green('\n🎉 版本发布成功！\n'));
      console.log(chalk.blue('📝 下一步:'));
      console.log(chalk.gray('  1. 检查生成的CHANGELOG.md'));
      console.log(chalk.gray('  2. 推送标签: git push --follow-tags origin main'));
      console.log(chalk.gray('  3. 发布到npm: npm publish'));

    } catch (error) {
      console.log(chalk.red(`❌ 版本发布失败: ${error.message}`));
      console.log(chalk.yellow('\n💡 常见解决方案:'));
      console.log(chalk.gray('  - 确保所有更改已提交'));
      console.log(chalk.gray('  - 检查是否有未推送的提交'));
      console.log(chalk.gray('  - 验证项目依赖是否完整'));
    }
  }
}

module.exports = { ReleaseManager };
