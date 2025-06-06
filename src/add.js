const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');

class AddManager {
  constructor() {
    this.currentDir = process.cwd();
  }

  /**
   * 检查是否在Git仓库中
   */
  checkGitRepository() {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      return true;
    } catch {
      console.log(chalk.red('❌ 错误: 当前目录不是Git仓库'));
      console.log(chalk.yellow('💡 请在Git仓库根目录运行此命令'));
      return false;
    }
  }

  /**
   * 获取未跟踪和已修改的文件
   */
  getChangedFiles() {
    try {
      // 获取所有状态的文件
      const statusOutput = execSync('git status --porcelain', { encoding: 'utf8' });
      
      if (!statusOutput.trim()) {
        return { untracked: [], modified: [], all: [] };
      }

      const lines = statusOutput.trim().split('\n');
      const untracked = [];
      const modified = [];
      const all = [];

      lines.forEach(line => {
        const status = line.substring(0, 2);
        const filename = line.substring(3);
        
        all.push({ status, filename, display: `${status} ${filename}` });
        
        if (status.includes('?')) {
          untracked.push(filename);
        } else if (status.includes('M') || status.includes('A') || status.includes('D')) {
          modified.push(filename);
        }
      });

      return { untracked, modified, all };
    } catch (error) {
      console.log(chalk.red('❌ 获取文件状态失败:', error.message));
      return { untracked: [], modified: [], all: [] };
    }
  }

  /**
   * 执行交互式添加
   */
  async interactiveAdd() {
    if (!this.checkGitRepository()) return;

    const { untracked, modified, all } = this.getChangedFiles();

    if (all.length === 0) {
      console.log(chalk.green('✅ 工作区干净，没有需要添加的文件'));
      return;
    }

    console.log(chalk.blue('📁 发现以下变更的文件:\n'));
    
    // 显示文件状态
    all.forEach(({ status, filename }) => {
      const statusText = this.getStatusText(status);
      console.log(`  ${statusText} ${filename}`);
    });

    console.log(); // 空行

    const choices = [
      {
        name: '📦 添加所有文件 (git add .)',
        value: 'all'
      },
      {
        name: '📝 选择特定文件添加',
        value: 'select'
      },
      {
        name: '📋 添加已跟踪的修改文件 (git add -u)',
        value: 'tracked',
        disabled: modified.length === 0 ? '没有已跟踪的修改文件' : false
      },
      {
        name: '❌ 取消操作',
        value: 'cancel'
      }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '选择添加方式:',
        choices
      }
    ]);

    switch (action) {
      case 'all':
        await this.addAll();
        break;
      case 'select':
        await this.selectiveAdd(all);
        break;
      case 'tracked':
        await this.addTracked();
        break;
      case 'cancel':
        console.log(chalk.yellow('👋 操作已取消'));
        break;
    }
  }

  /**
   * 选择性添加文件
   */
  async selectiveAdd(files) {
    const choices = files.map(({ filename, display }) => ({
      name: display,
      value: filename,
      checked: false
    }));

    const { selectedFiles } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedFiles',
        message: '选择要添加的文件:',
        choices,
        validate: (input) => {
          if (input.length === 0) {
            return '请至少选择一个文件';
          }
          return true;
        }
      }
    ]);

    if (selectedFiles.length > 0) {
      await this.addFiles(selectedFiles);
    }
  }

  /**
   * 添加所有文件
   */
  async addAll() {
    try {
      console.log(chalk.blue('📦 添加所有文件...'));
      execSync('git add .', { stdio: 'inherit' });
      console.log(chalk.green('✅ 已添加所有文件到暂存区'));
      this.showNextSteps();
    } catch (error) {
      console.log(chalk.red('❌ 添加文件失败:', error.message));
    }
  }

  /**
   * 添加已跟踪的修改文件
   */
  async addTracked() {
    try {
      console.log(chalk.blue('📝 添加已跟踪的修改文件...'));
      execSync('git add -u', { stdio: 'inherit' });
      console.log(chalk.green('✅ 已添加所有修改文件到暂存区'));
      this.showNextSteps();
    } catch (error) {
      console.log(chalk.red('❌ 添加文件失败:', error.message));
    }
  }

  /**
   * 添加指定文件
   */
  async addFiles(files) {
    try {
      console.log(chalk.blue(`📁 添加 ${files.length} 个文件...`));
      
      // 对文件名进行转义处理
      const escapedFiles = files.map(file => `"${file}"`).join(' ');
      execSync(`git add ${escapedFiles}`, { stdio: 'inherit' });
      
      console.log(chalk.green('✅ 文件已添加到暂存区:'));
      files.forEach(file => {
        console.log(chalk.gray(`   • ${file}`));
      });
      
      this.showNextSteps();
    } catch (error) {
      console.log(chalk.red('❌ 添加文件失败:', error.message));
    }
  }

  /**
   * 直接添加命令行参数指定的文件
   */
  async addDirect(args) {
    if (!this.checkGitRepository()) return;

    try {
      const files = args.join(' ');
      console.log(chalk.blue(`📁 添加文件: ${files}`));
      
      execSync(`git add ${files}`, { stdio: 'inherit' });
      console.log(chalk.green('✅ 文件已添加到暂存区'));
      this.showNextSteps();
    } catch (error) {
      console.log(chalk.red('❌ 添加文件失败:', error.message));
      console.log(chalk.yellow('💡 请检查文件路径是否正确'));
    }
  }

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      '??': chalk.red('🆕 新文件'),
      ' M': chalk.yellow('📝 已修改'),
      'M ': chalk.green('📝 已暂存'),
      'MM': chalk.blue('📝 部分暂存'),
      ' D': chalk.red('🗑️  已删除'),
      'D ': chalk.green('🗑️  已暂存删除'),
      'A ': chalk.green('➕ 新增'),
      'AM': chalk.blue('➕ 新增并修改'),
      'R ': chalk.cyan('🔄 重命名'),
      'RM': chalk.cyan('🔄 重命名并修改')
    };

    return statusMap[status] || chalk.gray(`${status} 未知状态`);
  }

  /**
   * 显示后续步骤提示
   */
  showNextSteps() {
    console.log(chalk.blue('\n💡 后续步骤:'));
    console.log(chalk.gray('   gg commit          # 规范化提交'));
    console.log(chalk.gray('   git status         # 查看当前状态'));
    console.log(chalk.gray('   git diff --cached  # 查看暂存区差异'));
  }
}

module.exports = { AddManager };
