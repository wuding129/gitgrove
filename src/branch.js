const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { execSync } = require('child_process');

class BranchManager {
  constructor() {
    this.currentDir = process.cwd();
    this.gitRoot = this.findGitRoot();
    this.packageJsonDir = this.findNearestPackageJson();
  }

  /**
   * 查找Git根目录
   */
  findGitRoot() {
    let currentPath = this.currentDir;
    
    while (currentPath !== path.dirname(currentPath)) {
      if (fs.existsSync(path.join(currentPath, '.git'))) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }
    
    throw new Error('❌ 当前目录不在Git仓库中');
  }

  /**
   * 查找最近的package.json目录
   */
  findNearestPackageJson() {
    let currentPath = this.currentDir;
    
    while (currentPath !== path.dirname(currentPath)) {
      if (fs.existsSync(path.join(currentPath, 'package.json'))) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }
    
    return null;
  }

  /**
   * 检测包管理器
   */
  detectPackageManager() {
    if (this.packageJsonDir) {
      if (fs.existsSync(path.join(this.packageJsonDir, 'pnpm-lock.yaml'))) {
        return 'pnpm';
      }
      if (fs.existsSync(path.join(this.packageJsonDir, 'yarn.lock'))) {
        return 'yarn';
      }
    }
    
    // 检查Git根目录
    if (fs.existsSync(path.join(this.gitRoot, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(this.gitRoot, 'yarn.lock'))) {
      return 'yarn';
    }
    
    return 'npm';
  }

  /**
   * 验证分支名称格式
   */
  validateBranchName(branchName, type) {
    // 基本格式检查
    if (!/^[a-z_0-9.]+$/.test(branchName)) {
      throw new Error('分支名称只能包含小写字母、数字、下划线和点');
    }

    // 类型特定格式验证
    switch (type) {
      case 'feature':
        if (!/^feature_[a-z0-9]+_[a-z0-9_]+$/.test(branchName)) {
          throw new Error('功能分支格式错误！正确格式: feature_[模块]_[描述]');
        }
        break;
      case 'hotfix':
        if (!/^hotfix_v?[0-9.]+_[a-z0-9_]+$/.test(branchName)) {
          throw new Error('热修复分支格式错误！正确格式: hotfix_v[版本]_[描述]');
        }
        break;
      case 'bugfix':
        if (!/^bugfix_[a-z0-9_]+$/.test(branchName)) {
          throw new Error('问题修复分支格式错误！正确格式: bugfix_[描述]');
        }
        break;
    }

    return true;
  }

  /**
   * 创建分支
   */
  async createBranch() {
    try {
      console.log(chalk.blue('🌿 GitGrove 分支管理助手'));
      console.log(chalk.gray(`📁 Git根目录: ${this.gitRoot}`));
      if (this.packageJsonDir) {
        console.log(chalk.gray(`📦 项目根目录: ${this.packageJsonDir}`));
      }
      console.log('');

      // 检查当前分支状态
      let currentBranch;
      try {
        currentBranch = execSync('git branch --show-current', { 
          encoding: 'utf8', 
          cwd: this.gitRoot 
        }).trim();
        console.log(chalk.cyan(`📍 当前分支: ${currentBranch}`));
      } catch (error) {
        console.log(chalk.yellow('⚠️  无法获取当前分支信息'));
      }

      // 检查是否有未提交的更改
      try {
        const status = execSync('git status --porcelain', { 
          encoding: 'utf8', 
          cwd: this.gitRoot 
        });
        
        if (status.trim()) {
          console.log(chalk.yellow('⚠️  当前有未提交的更改:'));
          console.log(status);
          
          const { continueAnyway } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'continueAnyway',
              message: '是否继续创建分支？',
              default: false
            }
          ]);
          
          if (!continueAnyway) {
            console.log(chalk.yellow('❌ 已取消分支创建'));
            return;
          }
        }
      } catch (error) {
        // 忽略git status错误
      }

      console.log('');

      // 交互式选择分支类型
      const branchTypes = [
        {
          name: '🚀 feature - 新功能开发',
          value: 'feature',
          description: '用于开发新功能，格式: feature_[模块]_[描述]'
        },
        {
          name: '🔥 hotfix - 紧急修复',
          value: 'hotfix', 
          description: '用于紧急修复，格式: hotfix_v[版本]_[描述]'
        },
        {
          name: '🐛 bugfix - 问题修复',
          value: 'bugfix',
          description: '用于修复问题，格式: bugfix_[描述]'
        }
      ];

      const { branchType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'branchType',
          message: '选择分支类型:',
          choices: branchTypes,
          pageSize: 3
        }
      ]);

      let branchName;

      // 根据类型收集信息
      switch (branchType) {
        case 'feature':
          const featureAnswers = await inquirer.prompt([
            {
              type: 'input',
              name: 'module',
              message: '输入模块名称 (如: user, payment):',
              validate: (input) => {
                if (!input.trim()) return '模块名称不能为空';
                if (!/^[a-z0-9]+$/.test(input)) return '模块名称只能包含小写字母和数字';
                return true;
              }
            },
            {
              type: 'input',
              name: 'description',
              message: '输入功能描述 (如: login, checkout):',
              validate: (input) => {
                if (!input.trim()) return '功能描述不能为空';
                if (!/^[a-z0-9_]+$/.test(input)) return '功能描述只能包含小写字母、数字和下划线';
                return true;
              }
            }
          ]);
          branchName = `feature_${featureAnswers.module}_${featureAnswers.description}`;
          break;

        case 'hotfix':
          const hotfixAnswers = await inquirer.prompt([
            {
              type: 'input',
              name: 'version',
              message: '输入版本号 (如: 1.0.3):',
              validate: (input) => {
                if (!input.trim()) return '版本号不能为空';
                if (!/^[0-9.]+$/.test(input)) return '版本号只能包含数字和点';
                return true;
              }
            },
            {
              type: 'input',
              name: 'description',
              message: '输入修复描述 (如: login_fix):',
              validate: (input) => {
                if (!input.trim()) return '修复描述不能为空';
                if (!/^[a-z0-9_]+$/.test(input)) return '修复描述只能包含小写字母、数字和下划线';
                return true;
              }
            }
          ]);
          branchName = `hotfix_v${hotfixAnswers.version}_${hotfixAnswers.description}`;
          break;

        case 'bugfix':
          const bugfixAnswers = await inquirer.prompt([
            {
              type: 'input',
              name: 'description',
              message: '输入问题描述 (如: scroll_error):',
              validate: (input) => {
                if (!input.trim()) return '问题描述不能为空';
                if (!/^[a-z0-9_]+$/.test(input)) return '问题描述只能包含小写字母、数字和下划线';
                return true;
              }
            }
          ]);
          branchName = `bugfix_${bugfixAnswers.description}`;
          break;
      }

      // 验证分支名称
      this.validateBranchName(branchName, branchType);

      // 显示预览
      console.log('');
      console.log(chalk.cyan('📋 分支信息预览:'));
      console.log(chalk.white(`   类型: ${branchType}`));
      console.log(chalk.white(`   名称: ${branchName}`));
      console.log('');

      // 确认创建
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: '确认创建以上分支?',
          default: true
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('❌ 已取消分支创建'));
        return;
      }

      // 创建并切换分支
      try {
        const isWindows = process.platform === 'win32';
        execSync(`git checkout -b ${branchName}`, {
          stdio: 'inherit',
          cwd: this.gitRoot,
          shell: isWindows
        });

        console.log(chalk.green('✅ 分支创建成功！'));
        console.log('');
        console.log(chalk.blue('📝 下一步:'));
        console.log('1. 开始开发你的功能');
        
        const packageManager = this.detectPackageManager();
        console.log(`2. 使用 'gg commit/gg c' 或 '${packageManager} run commit' 进行规范化提交`);
        console.log(`3. 推送分支: git push -u origin ${branchName}`);

      } catch (error) {
        throw new Error(`分支创建失败: ${error.message}`);
      }

    } catch (error) {
      console.error(chalk.red('❌ 分支创建失败:'), error.message);
      process.exit(1);
    }
  }
}

module.exports = { BranchManager };
