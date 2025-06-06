const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { execSync } = require('child_process');

class HooksFixer {
  constructor() {
    this.currentDir = process.cwd();
    const { gitRoot, projectRoot } = this.findProjectDirectories();
    this.gitRoot = gitRoot;
    this.projectRoot = projectRoot;
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
   * 检查hooks状态
   */
  checkHooksStatus() {
    const hooksDir = path.join(this.gitRoot, '.git/hooks');
    const lefthookPath = path.join(this.gitRoot, 'lefthook.yml');
    
    const status = {
      hasHooksDir: fs.existsSync(hooksDir),
      hasExistingHooks: false,
      hasLefthookConfig: fs.existsSync(lefthookPath),
      conflictingHooks: []
    };

    if (status.hasHooksDir) {
      const hookFiles = fs.readdirSync(hooksDir).filter(file => 
        !file.endsWith('.sample') && fs.statSync(path.join(hooksDir, file)).isFile()
      );
      status.hasExistingHooks = hookFiles.length > 0;
      status.conflictingHooks = hookFiles;
    }

    return status;
  }

  /**
   * 备份现有hooks
   */
  async backupExistingHooks() {
    const hooksDir = path.join(this.gitRoot, '.git/hooks');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.gitRoot, `.git/hooks-backup-${timestamp}`);

    try {
      await fs.ensureDir(backupDir);
      const files = await fs.readdir(hooksDir);
      
      for (const file of files) {
        if (!file.endsWith('.sample')) {
          const srcPath = path.join(hooksDir, file);
          const destPath = path.join(backupDir, file);
          if ((await fs.stat(srcPath)).isFile()) {
            await fs.copy(srcPath, destPath);
          }
        }
      }

      return backupDir;
    } catch (error) {
      throw new Error(`备份失败: ${error.message}`);
    }
  }

  /**
   * 清理hooks目录
   */
  async cleanHooksDirectory() {
    const hooksDir = path.join(this.gitRoot, '.git/hooks');
    
    try {
      const files = await fs.readdir(hooksDir);
      
      for (const file of files) {
        if (!file.endsWith('.sample')) {
          const filePath = path.join(hooksDir, file);
          if ((await fs.stat(filePath)).isFile()) {
            await fs.remove(filePath);
          }
        }
      }
    } catch (error) {
      throw new Error(`清理hooks目录失败: ${error.message}`);
    }
  }

  /**
   * 重新安装lefthook
   */
  async reinstallLefthook() {
    try {
      // 检查lefthook是否可用
      execSync('which lefthook', { stdio: 'ignore' });
      
      // 在Git根目录运行lefthook install
      execSync('lefthook install', { 
        cwd: this.gitRoot,
        stdio: 'inherit'
      });
    } catch (error) {
      throw new Error('lefthook不可用或安装失败');
    }
  }

  /**
   * 主修复流程
   */
  async fixHooksConflict() {
    console.log(chalk.cyan('\n🔧 Git Hooks冲突修复工具'));
    console.log(chalk.cyan('=========================\n'));

    // 基础检查
    if (!this.gitRoot) {
      console.log(chalk.red('❌ 错误: 当前目录不在Git仓库中'));
      return;
    }

    // 显示目录信息
    console.log(chalk.blue(`📁 Git根目录: ${this.gitRoot}`));
    if (this.projectRoot && this.projectRoot !== this.gitRoot) {
      console.log(chalk.blue(`📦 项目目录: ${this.projectRoot}`));
    }
    console.log();

    // 检查hooks状态
    const status = this.checkHooksStatus();
    
    if (!status.hasLefthookConfig) {
      console.log(chalk.red('❌ 错误: 找不到lefthook.yml配置文件'));
      console.log(chalk.yellow('💡 请先运行: gg init 配置Git工作流'));
      return;
    }

    if (!status.hasExistingHooks) {
      console.log(chalk.green('✅ 没有发现hooks冲突'));
      
      // 尝试安装lefthook
      const spinner = ora('🔧 安装lefthook hooks...').start();
      try {
        await this.reinstallLefthook();
        spinner.succeed('✅ Lefthook hooks安装完成');
      } catch (error) {
        spinner.fail('❌ Lefthook安装失败');
        console.log(chalk.red(error.message));
        console.log(chalk.yellow('💡 请确保已全局安装lefthook: npm install -g lefthook'));
      }
      return;
    }

    // 显示冲突信息
    console.log(chalk.yellow('⚠️  发现现有的Git hooks:'));
    status.conflictingHooks.forEach(hook => {
      console.log(chalk.gray(`   - ${hook}`));
    });
    console.log();

    // 询问用户处理方式
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '选择处理方式:',
        choices: [
          {
            name: '🔄 备份现有hooks并重新安装lefthook (推荐)',
            value: 'backup_and_reinstall'
          },
          {
            name: '🗑️  直接删除现有hooks并安装lefthook',
            value: 'delete_and_reinstall'
          },
          {
            name: '❌ 取消操作',
            value: 'cancel'
          }
        ]
      }
    ]);

    if (action === 'cancel') {
      console.log(chalk.yellow('操作已取消'));
      return;
    }

    // 执行修复
    try {
      if (action === 'backup_and_reinstall') {
        const backupSpinner = ora('📦 备份现有hooks...').start();
        const backupDir = await this.backupExistingHooks();
        backupSpinner.succeed(`✅ 备份完成: ${path.relative(this.gitRoot, backupDir)}`);
      }

      const cleanSpinner = ora('🧹 清理hooks目录...').start();
      await this.cleanHooksDirectory();
      cleanSpinner.succeed('✅ Hooks目录清理完成');

      const installSpinner = ora('🔧 重新安装lefthook...').start();
      await this.reinstallLefthook();
      installSpinner.succeed('✅ Lefthook重新安装完成');

      console.log(chalk.green('\n🎉 Git hooks冲突修复完成！\n'));
      console.log(chalk.blue('💡 提示:'));
      console.log(chalk.gray('  - 现在可以正常使用 gg commit 进行提交'));
      console.log(chalk.gray('  - Git hooks会自动进行代码检查和格式化'));
      
      if (action === 'backup_and_reinstall') {
        console.log(chalk.gray('  - 如需恢复原hooks，请查看备份目录'));
      }

    } catch (error) {
      console.log(chalk.red(`❌ 修复失败: ${error.message}`));
    }
  }
}

// 保持向后兼容
async function fixHooksConflict() {
  const fixer = new HooksFixer();
  await fixer.fixHooksConflict();
}
  console.log();

  const spinner = ora('🧹 清理冲突的Git hooks...').start();

  try {
    const hooksDir = path.join(gitRoot, '.git', 'hooks');
    
    // 备份现有hooks
    if (fs.existsSync(hooksDir)) {
      const backupDir = path.join(gitRoot, '.git', `hooks-backup-${Date.now()}`);
      const hasExistingHooks = fs.readdirSync(hooksDir).some(file => 
        ['pre-commit', 'commit-msg', 'pre-push'].includes(file)
      );
      
      if (hasExistingHooks) {
        await fs.copy(hooksDir, backupDir);
        spinner.info(chalk.yellow(`📦 已备份现有hooks到: ${path.relative(gitRoot, backupDir)}`));
      }
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

    // 清理husky配置 - 优先在项目目录清理，如果不存在则在Git根目录清理
    const workingDir = projectRoot || gitRoot;
    const huskyDir = path.join(workingDir, '.husky');
    if (fs.existsSync(huskyDir)) {
      await fs.remove(huskyDir);
      spinner.info(chalk.yellow('🗑️  已清理旧的husky配置'));
    }

    spinner.text = '🚀 重新安装lefthook hooks...';

    // 检测包管理工具 - 优先在项目目录查找，然后在Git根目录查找
    let packageManager = 'npm';
    
    if (fs.existsSync(path.join(workingDir, 'pnpm-lock.yaml')) || 
        (workingDir !== gitRoot && fs.existsSync(path.join(gitRoot, 'pnpm-lock.yaml')))) {
      packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(workingDir, 'yarn.lock')) || 
               (workingDir !== gitRoot && fs.existsSync(path.join(gitRoot, 'yarn.lock')))) {
      packageManager = 'yarn';
    }

    // 尝试不同方式安装lefthook
    let installSuccess = false;
    
    try {
      execSync('lefthook install', { 
        cwd: workingDir, 
        stdio: 'pipe' 
      });
      installSuccess = true;
      spinner.info(chalk.green('使用全局lefthook安装成功'));
    } catch (error) {
      try {
        execSync('npx lefthook install', { 
          cwd: workingDir, 
          stdio: 'pipe' 
        });
        installSuccess = true;
        spinner.info(chalk.green('使用npx lefthook安装成功'));
      } catch (error2) {
        try {
          const runCommand = packageManager === 'npm' ? 'npm run' :
                           packageManager === 'pnpm' ? 'pnpm run' : 'yarn run';
          execSync(`${runCommand} git:setup`, { 
            cwd: workingDir, 
            stdio: 'pipe' 
          });
          installSuccess = true;
          spinner.info(chalk.green(`使用${packageManager}脚本安装成功`));
        } catch (error3) {
          spinner.warn(chalk.yellow('⚠️  自动安装失败，请手动运行安装命令'));
        }
      }
    }

    // 验证安装结果
    const requiredHooks = ['pre-commit', 'commit-msg'];
    const allHooksInstalled = requiredHooks.every(hook => 
      fs.existsSync(path.join(gitRoot, '.git', 'hooks', hook))
    );

    if (allHooksInstalled) {
      spinner.succeed('✅ Git hooks冲突修复完成！');
      
      console.log(chalk.blue('\n📋 已安装的hooks:'));
      const hooksDir = path.join(projectRoot, '.git', 'hooks');
      const installedHooks = fs.readdirSync(hooksDir)
        .filter(file => ['pre-commit', 'commit-msg', 'pre-push'].includes(file));
      
      installedHooks.forEach(hook => {
        console.log(chalk.green(`  ✅ ${hook}`));
      });
    } else {
      spinner.warn('⚠️  Lefthook hooks可能未完全安装');
      console.log(chalk.blue('\n💡 建议手动运行:'));
      console.log(`  ${packageManager} run git:setup`);
      console.log('  或检查lefthook.yml配置文件');
    }

    console.log(chalk.blue('\n📝 下一步:'));
    console.log(`1. 测试提交: ${packageManager} run test:commit`);
    console.log(`2. 正常使用: ${packageManager} run commit`);
    console.log(`3. 创建分支: ${packageManager} run branch`);

  } catch (error) {
    spinner.fail('❌ hooks修复过程中出现错误');
    console.error(chalk.red(`错误详情: ${error.message}`));
    
    console.log(chalk.blue('\n💡 手动修复步骤:'));
    console.log('1. 删除冲突文件: rm -f .git/hooks/*.old');
    console.log('2. 删除husky配置: rm -rf .husky');
    console.log('3. 重新安装: lefthook install');
  }
}

module.exports = { fixHooksConflict };
