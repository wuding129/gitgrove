const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { execSync, spawn } = require('child_process');

class CommitManager {
  constructor(options = {}) {
    this.currentDir = process.cwd();
    this.gitRoot = this.findGitRoot();
    this.packageJsonDir = this.findNearestPackageJson();
    // Commander.js 将 --no-hooks 转换为 hooks: false
    this.noHooks = options.hooks === false || options.noHooks === true;
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
   * 检查是否安装了commitizen
   */
  checkCommitizen() {
    // 首先检查当前项目是否有commitizen配置
    const packageJsonPath = this.packageJsonDir ? path.join(this.packageJsonDir, 'package.json') : null;
    
    if (packageJsonPath && fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // 检查是否有commitizen配置
        if (packageJson.config && packageJson.config.commitizen) {
          return { hasConfig: true, projectRoot: this.packageJsonDir };
        }
        
        // 检查是否有commitizen依赖
        const hasCommitizen = (packageJson.devDependencies && packageJson.devDependencies.commitizen) ||
                             (packageJson.dependencies && packageJson.dependencies.commitizen);
        
        if (hasCommitizen) {
          return { hasConfig: false, hasCommitizen: true, projectRoot: this.packageJsonDir };
        }
      } catch (error) {
        console.warn(chalk.yellow('⚠️  读取package.json失败'));
      }
    }

    // 在monorepo场景下，也检查Git根目录的配置
    if (this.gitRoot !== this.packageJsonDir) {
      const gitRootPackageJsonPath = path.join(this.gitRoot, 'package.json');
      if (fs.existsSync(gitRootPackageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(gitRootPackageJsonPath, 'utf8'));
          
          // 检查是否有commitizen配置
          if (packageJson.config && packageJson.config.commitizen) {
            return { hasConfig: true, projectRoot: this.gitRoot };
          }
          
          // 检查是否有commitizen依赖
          const hasCommitizen = (packageJson.devDependencies && packageJson.devDependencies.commitizen) ||
                               (packageJson.dependencies && packageJson.dependencies.commitizen);
          
          if (hasCommitizen) {
            return { hasConfig: false, hasCommitizen: true, projectRoot: this.gitRoot };
          }
        } catch (error) {
          // 忽略读取错误
        }
      }
    }

    // 检查是否有配置文件（.cz-config.js 或 commitlint.config.js）
    const configFiles = ['.cz-config.js', 'commitlint.config.js'];
    
    // 先检查当前项目目录
    if (this.packageJsonDir) {
      for (const configFile of configFiles) {
        if (fs.existsSync(path.join(this.packageJsonDir, configFile))) {
          return { hasConfig: true, projectRoot: this.packageJsonDir };
        }
      }
    }
    
    // 再检查Git根目录
    for (const configFile of configFiles) {
      if (fs.existsSync(path.join(this.gitRoot, configFile))) {
        return { hasConfig: true, projectRoot: this.gitRoot };
      }
    }    // 检查全局commitizen
    const isWindows = process.platform === 'win32';
    const whichCommand = isWindows ? 'where.exe' : 'which';
    
    try {
      execSync(`${whichCommand} cz`, { stdio: 'pipe' });
      return { hasGlobal: true };
    } catch {
      // cz not found globally
    }

    try {
      execSync(`${whichCommand} commitizen`, { stdio: 'pipe' });
      return { hasGlobal: true };
    } catch {
      // commitizen not found globally
    }

    return { hasConfig: false, hasCommitizen: false, hasGlobal: false };
  }

  /**
   * 使用Commitizen进行提交
   */
  async useCommitizen(projectRoot, useGlobal = false) {
    console.log(chalk.blue('🚀 使用Commitizen进行规范化提交...'));
    
    return new Promise((resolve, reject) => {
      // 切换到适当的目录执行commitizen
      const originalCwd = process.cwd();
      
      try {
        // 确定执行目录：优先使用有配置文件的项目目录，其次是Git根目录
        const executionDir = projectRoot || this.packageJsonDir || this.gitRoot;
        
        if (executionDir && executionDir !== originalCwd) {
          process.chdir(executionDir);
        }
          let command, args;
        
        if (useGlobal) {
          // 使用全局commitizen，直接调用cz命令
          command = 'cz';
          args = [];
        } else {
          // 尝试使用本地的commitizen
          const isWindows = process.platform === 'win32';
          const whichCommand = isWindows ? 'where.exe' : 'which';
          
          // 检查是否有pnpm
          try {
            execSync(`${whichCommand} pnpm`, { stdio: 'pipe' });
            command = isWindows ? 'pnpm.cmd' : 'pnpm';
            args = ['exec', 'cz'];
            console.log(chalk.gray(`🔍 检测到pnpm，使用命令: ${command}`));
          } catch {
            // 检查是否有yarn
            try {
              execSync(`${whichCommand} yarn`, { stdio: 'pipe' });
              command = isWindows ? 'yarn.cmd' : 'yarn';
              args = ['cz'];
              console.log(chalk.gray(`🔍 检测到yarn，使用命令: ${command}`));
            } catch {
              // 检查是否有npm/npx
              try {
                execSync(`${whichCommand} npm`, { stdio: 'pipe' });
                // Windows下npx可能不在PATH中，直接使用npm exec
                if (isWindows) {
                  command = 'npm.cmd';
                  args = ['exec', 'cz'];
                  console.log(chalk.gray(`🔍 检测到npm，使用命令: ${command}`));
                } else {
                  // 检查npx是否可用
                  try {
                    execSync(`${whichCommand} npx`, { stdio: 'pipe' });
                    command = 'npx';
                    args = ['cz'];
                    console.log(chalk.gray(`🔍 检测到npx，使用命令: ${command}`));
                  } catch {
                    command = 'npm';
                    args = ['exec', 'cz'];
                    console.log(chalk.gray(`🔍 fallback到npm，使用命令: ${command}`));
                  }
                }
              } catch {
                throw new Error('未找到npm、yarn或pnpm，请确保已安装Node.js包管理器');
              }
            }
          }
        }
        
        console.log(chalk.gray(`💡 在目录 ${executionDir} 中执行: ${command} ${args.join(' ')}`));
        
        // Windows下需要特殊处理spawn命令
        const isWindows = process.platform === 'win32';
        const spawnOptions = {
          stdio: 'inherit',
          cwd: executionDir
        };
        
        // Windows下需要设置shell: true
        if (isWindows) {
          spawnOptions.shell = true;
        }
        
        const child = spawn(command, args, spawnOptions);
        
        child.on('close', (code) => {
          process.chdir(originalCwd);
          if (code === 0) {
            console.log(chalk.green('✅ 提交成功！'));
            resolve();
          } else {
            reject(new Error(`Commitizen退出，代码: ${code}`));
          }
        });
          child.on('error', (error) => {
          process.chdir(originalCwd);
          if (error.code === 'ENOENT') {
            reject(new Error(`命令 "${command}" 未找到，请确保已正确安装 ${command === 'npm' ? 'Node.js' : command}`));
          } else {
            reject(new Error(`执行 ${command} 时出错: ${error.message}`));
          }
        });
        
      } catch (error) {
        process.chdir(originalCwd);
        reject(error);
      }
    });
  }

  /**
   * 使用内置提交界面
   */
  async useBuiltinCommit() {
    console.log(chalk.blue('📝 使用内置提交界面...'));
    
    const commitTypes = [
      { name: '✨ feat:     新功能', value: 'feat' },
      { name: '🐛 fix:      修复bug', value: 'fix' },
      { name: '📝 docs:     文档更新', value: 'docs' },
      { name: '💄 style:    代码格式(不影响代码运行的变动)', value: 'style' },
      { name: '♻️  refactor: 代码重构(既不是新增功能，也不是修改bug)', value: 'refactor' },
      { name: '⚡ perf:     性能优化', value: 'perf' },
      { name: '✅ test:     添加测试', value: 'test' },
      { name: '🔧 chore:    构建过程或辅助工具的变动', value: 'chore' },
      { name: '🔨 build:    构建系统或外部依赖的变动', value: 'build' },
      { name: '🔄 ci:       CI配置文件和脚本的变动', value: 'ci' }
    ];

    try {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: '选择提交类型:',
          choices: commitTypes,
          pageSize: 10
        },
        {
          type: 'input',
          name: 'scope',
          message: '输入影响范围 (可选，直接回车跳过):',
          when: () => true
        },
        {
          type: 'input',
          name: 'subject',
          message: '输入提交描述:',
          validate: (input) => {
            if (!input.trim()) {
              return '提交描述不能为空';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'body',
          message: '输入详细描述 (可选，直接回车跳过):'
        },
        {
          type: 'confirm',
          name: 'confirm',
          message: (answers) => {
            const scope = answers.scope ? `(${answers.scope})` : '';
            const commitMessage = `${answers.type}${scope}: ${answers.subject}`;
            const preview = answers.body ? 
              `${commitMessage}\n\n${answers.body}` : 
              commitMessage;
            
            console.log(chalk.cyan('\n📋 提交预览:'));
            console.log(chalk.white(preview));
            console.log('');
            
            return '确认提交以上内容?';
          },
          default: true
        }
      ]);

      if (!answers.confirm) {
        console.log(chalk.yellow('❌ 已取消提交'));
        return;
      }

      // 构建提交信息
      const scope = answers.scope ? `(${answers.scope})` : '';
      const commitMessage = `${answers.type}${scope}: ${answers.subject}`;
      
      const fullMessage = answers.body ? 
        `${commitMessage}\n\n${answers.body}` : 
        commitMessage;

      // 执行git commit
      try {
        // Windows下需要特殊处理引号转义
        const isWindows = process.platform === 'win32';
        let commitCommand;
        
        if (isWindows) {
          // Windows下使用双引号包裹，内部双引号转义为\"
          const escapedMessage = fullMessage.replace(/"/g, '\\"');
          commitCommand = `git commit${this.noHooks ? ' --no-verify' : ''} -m "${escapedMessage}"`;
        } else {
          // Unix系统下的处理
          const escapedMessage = fullMessage.replace(/"/g, '\\"');
          commitCommand = `git commit${this.noHooks ? ' --no-verify' : ''} -m "${escapedMessage}"`;
        }
        
        if (this.noHooks) {
          console.log(chalk.yellow('⚠️  已跳过Git hooks验证'));
        }
        
        execSync(commitCommand, {
          stdio: 'inherit',
          cwd: this.gitRoot,
          shell: isWindows // Windows下需要shell
        });
        console.log(chalk.green('✅ 提交成功！'));
      } catch (error) {
        // 如果使用了--no-hooks，就不需要检查Git hooks错误
        if (!this.noHooks && error.status === 1) {
          throw new Error('Git hooks阻止提交');
        }
        throw new Error('Git提交失败: ' + error.message);
      }

    } catch (error) {
      if (error.isTtyError) {
        console.error(chalk.red('❌ 当前环境不支持交互式界面'));
      } else {
        throw error;
      }
    }
  }

  /**
   * 检查是否有待提交的更改
   */
  checkGitStatus() {
    try {
      const status = execSync('git status --porcelain', { 
        encoding: 'utf8', 
        cwd: this.gitRoot 
      });
      
      if (!status.trim()) {
        console.log(chalk.yellow('⚠️  没有待提交的更改'));
        return false;
      }
      
      return true;
    } catch (error) {
      throw new Error('检查Git状态失败: ' + error.message);
    }
  }

  /**
   * 主要的提交流程
   */
  async commit() {
    try {
      console.log(chalk.blue('🌟 GitGrove 智能提交助手'));
      console.log(chalk.gray(`📁 Git根目录: ${this.gitRoot}`));
      if (this.packageJsonDir) {
        console.log(chalk.gray(`📦 项目根目录: ${this.packageJsonDir}`));
      }
      if (this.noHooks) {
        console.log(chalk.yellow('⚠️  已启用 --no-hooks 模式，将跳过所有Git hooks验证'));
      }
      console.log('');

      // 检查是否有待提交的更改
      if (!this.checkGitStatus()) {
        return;
      }

      // 显示当前状态
      console.log(chalk.cyan('📋 当前Git状态:'));
      execSync('git status --short', { stdio: 'inherit', cwd: this.gitRoot });
      console.log('');      // 检查Commitizen配置
      const commitizenStatus = this.checkCommitizen();
      
      // 如果启用了--no-hooks，直接使用内置提交界面，跳过Commitizen
      if (this.noHooks) {
        console.log(chalk.yellow('⚠️  --no-hooks模式：跳过Commitizen，使用内置提交界面'));
        await this.useBuiltinCommit();
        return;
      }
      
      if (commitizenStatus.hasConfig) {
        console.log(chalk.green('✅ 检测到Commitizen配置，使用项目配置进行提交'));
        try {
          await this.useCommitizen(commitizenStatus.projectRoot, false);
        } catch (error) {
          // 如果启用了--no-hooks，跳过Git hooks错误检查
          if (!this.noHooks && (error.message.includes('git exited with error code 1') || 
              error.message.includes('Commitizen退出，代码: 1'))) {
            console.log(chalk.red('❌ Git hooks阻止提交，流程终止'));
            return;
          }
          
          console.log(chalk.yellow('⚠️  Commitizen执行失败，切换到内置提交界面'));
          console.log(chalk.gray(`错误信息: ${error.message}`));
          await this.useBuiltinCommit();
        }
      } else if (commitizenStatus.hasCommitizen) {
        console.log(chalk.yellow('⚠️  检测到Commitizen但无配置，使用默认配置进行提交'));
        try {
          await this.useCommitizen(commitizenStatus.projectRoot, false);
        } catch (error) {
          // 如果启用了--no-hooks，跳过Git hooks错误检查
          if (!this.noHooks && (error.message.includes('git exited with error code 1') || 
              error.message.includes('Commitizen退出，代码: 1'))) {
            console.log(chalk.red('❌ Git hooks阻止提交，流程终止'));
            return;
          }
          
          console.log(chalk.yellow('⚠️  Commitizen执行失败，切换到内置提交界面'));
          console.log(chalk.gray(`错误信息: ${error.message}`));
          await this.useBuiltinCommit();
        }
      } else if (commitizenStatus.hasGlobal) {
        console.log(chalk.blue('🌐 使用全局Commitizen进行提交'));
        // 使用全局commitizen，但在有配置文件的目录中执行
        const executionDir = this.packageJsonDir || this.gitRoot;
        try {
          await this.useCommitizen(executionDir, true);
        } catch (error) {
          // 如果启用了--no-hooks，跳过Git hooks错误检查
          if (!this.noHooks && (error.message.includes('git exited with error code 1') || 
              error.message.includes('Commitizen退出，代码: 1'))) {
            console.log(chalk.red('❌ Git hooks阻止提交，流程终止'));
            return;
          }
          
          console.log(chalk.yellow('⚠️  全局Commitizen执行失败，切换到内置提交界面'));
          console.log(chalk.gray(`错误信息: ${error.message}`));
          await this.useBuiltinCommit();
        }
      } else {
        console.log(chalk.blue('🔧 未检测到Commitizen，使用内置提交界面'));
        await this.useBuiltinCommit();
      }

    } catch (error) {
      if (!this.noHooks && error.message.includes('Git hooks阻止提交')) {
        console.log(chalk.red('\n❌ 提交被Git hooks阻止，请按照提示修正后重试'));
        console.log(chalk.yellow('💡 你也可以使用 --no-hooks 选项跳过所有限制'));
        process.exit(1);
      } else {
        console.error(chalk.red('❌ 提交失败:'), error.message);
        process.exit(1);
      }
    }
  }
}

module.exports = { CommitManager };
