#!/usr/bin/env node

const { program } = require('commander');
const { initGitWorkflow } = require('../src/index');
const chalk = require('chalk');
const { version } = require('../package.json');

program
  .name('gitgrove')
  .description('🌟 Git规范化工作流一键初始化工具')
  .version(version, '-v, --version', '显示版本号')
  .helpOption('-h, --help', '显示帮助信息');

program
  .command('init')
  .description('初始化Git规范化工作流')
  .option('-f, --force', '强制覆盖现有配置')
  .option('-s, --skip-install', '跳过依赖安装')
  .option('--npm', '使用npm作为包管理器')
  .option('--pnpm', '使用pnpm作为包管理器')
  .option('--yarn', '使用yarn作为包管理器')
  .action(async (options) => {
    try {
      await initGitWorkflow(options);
    } catch (error) {
      console.error(chalk.red('❌ 初始化失败:'), error.message);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('检查当前项目的Git工作流配置状态')
  .action(() => {
    const { checkGitWorkflow } = require('../src/checker');
    checkGitWorkflow();
  });

program
  .command('fix')
  .description('修复Git hooks冲突问题')
  .action(async () => {
    const { fixHooksConflict } = require('../src/fixer');
    await fixHooksConflict();
  });

// 默认命令，如果没有指定子命令，就执行init
program
  .action(async (options) => {
    await initGitWorkflow(options);
  });

program.parse();
