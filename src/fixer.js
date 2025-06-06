const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { execSync } = require('child_process');

// 查找项目目录结构
function findProjectDirectories() {
  let currentDir = process.cwd();
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
  currentDir = process.cwd();
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      projectRoot = currentDir;
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  return { gitRoot, projectRoot };
}

async function fixHooksConflict() {
  console.log(chalk.cyan('🔧 Git Hooks冲突修复工具'));
  console.log(chalk.cyan('=========================\n'));

  const { gitRoot, projectRoot } = findProjectDirectories();

  // 检查是否在Git仓库中
  if (!gitRoot) {
    console.log(chalk.red('❌ 错误: 不在Git仓库中'));
    return;
  }

  // 显示目录信息
  console.log(chalk.blue(`📁 Git根目录: ${gitRoot}`));
  if (projectRoot && projectRoot !== gitRoot) {
    console.log(chalk.blue(`📦 项目目录: ${projectRoot}`));
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
