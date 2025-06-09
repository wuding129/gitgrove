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

program
  .command('add')
  .alias('a')
  .description('交互式添加文件到暂存区')
  .argument('[files...]', '要添加的文件路径')
  .action(async (files) => {
    const { AddManager } = require('../src/add');
    const addManager = new AddManager();
    
    if (files && files.length > 0) {
      // 直接添加指定文件
      await addManager.addDirect(files);
    } else {
      // 交互式添加
      await addManager.interactiveAdd();
    }
  });

program
  .command('commit')
  .alias('c')
  .description('规范化Git提交，支持普通项目和monorepo')
  .option('--no-hooks', '跳过所有Git hooks限制')
  .action(async (options) => {
    const { CommitManager } = require('../src/commit');
    const commitManager = new CommitManager(options);
    await commitManager.commit();
  });

program
  .command('branch')
  .alias('b')
  .description('交互式创建规范化分支')
  .action(async () => {
    const { BranchManager } = require('../src/branch');
    const branchManager = new BranchManager();
    await branchManager.createBranch();
  });

program
  .command('setup')
  .alias('s')
  .description('团队成员快速初始化（安装依赖、配置hooks）')
  .action(async () => {
    const { SetupManager } = require('../src/setup');
    const setupManager = new SetupManager();
    await setupManager.setup();
  });

program
  .command('release')
  .alias('r')
  .description('版本发布管理')
  .option('--major', '主版本发布 (1.0.0 -> 2.0.0)')
  .option('--minor', '次版本发布 (1.0.0 -> 1.1.0)')
  .option('--patch', '补丁版本发布 (1.0.0 -> 1.0.1)')
  .action(async (options) => {
    const { ReleaseManager } = require('../src/release');
    const releaseManager = new ReleaseManager();
    await releaseManager.release(options);
  });

// 默认命令，如果没有指定子命令，就执行init
program
  .action(async (options, cmd) => {
    // 只有在没有指定任何子命令时才执行init
    if (cmd.args.length === 0) {
      await initGitWorkflow(options);
    }
  });

program.parse();
