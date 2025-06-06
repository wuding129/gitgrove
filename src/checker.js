const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * 查找Git根目录和package.json所在目录
 * 支持monorepo场景：.git在父目录，package.json在子目录
 */
function findProjectDirectories() {
  let gitRoot = null;
  let packageJsonDir = null;
  const currentDir = process.cwd();
  
  // 从当前目录开始向上查找
  let currentPath = currentDir;
  
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
  if (gitRoot && !packageJsonDir && currentDir.startsWith(gitRoot)) {
    packageJsonDir = currentDir; // 使用当前目录作为项目根目录
  }
  
  return { gitRoot, packageJsonDir };
}

function checkGitWorkflow() {
  console.log(chalk.cyan('🔍 检查Git工作流配置状态\n'));

  const { gitRoot, packageJsonDir } = findProjectDirectories();
  const projectRoot = packageJsonDir || process.cwd();
  
  // 检查是否在Git仓库中
  if (!gitRoot) {
    console.log(chalk.red('❌ 未找到Git仓库，请确保在Git仓库中或其子目录中运行'));
    return;
  }

  // 检查是否有package.json
  if (!packageJsonDir) {
    console.log(chalk.yellow('⚠️  未找到package.json，建议先创建一个Node.js项目'));
    console.log(chalk.gray(`   Git根目录: ${gitRoot}`));
    console.log(chalk.gray(`   当前目录: ${process.cwd()}`));
    return;
  }

  // 显示项目信息
  const relativePath = path.relative(gitRoot, projectRoot);
  const projectInfo = relativePath ? `子项目: ${relativePath}` : '根项目';
  console.log(chalk.gray(`📁 Git根目录: ${gitRoot}`));
  console.log(chalk.gray(`📦 项目目录: ${projectRoot} (${projectInfo})\n`));

  console.log(chalk.blue('📋 检查配置文件:'));
  
  const configFiles = [
    { file: 'commitlint.config.js', desc: 'commitlint配置' },
    { file: '.cz-config.js', desc: 'commitizen配置' },
    { file: 'lefthook.yml', desc: 'lefthook配置' },
    { file: '.versionrc.js', desc: '版本发布配置' }
  ];

  configFiles.forEach(({ file, desc }) => {
    if (fs.existsSync(path.join(projectRoot, file))) {
      console.log(chalk.green(`✅ ${file} - ${desc}`));
    } else {
      console.log(chalk.red(`❌ ${file} - ${desc}`));
    }
  });

  console.log(chalk.blue('\n📦 检查依赖包:'));
  
  try {
    const packageJson = fs.readJsonSync(path.join(projectRoot, 'package.json'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = [
      { name: '@commitlint/cli', desc: '提交信息检查' },
      { name: '@commitlint/config-conventional', desc: '标准提交规范' },
      { name: 'commitizen', desc: '交互式提交工具' },
      { name: 'cz-customizable', desc: '自定义提交配置' },
      { name: 'lefthook', desc: 'Git hooks管理' },
      { name: 'standard-version', desc: '版本发布工具' }
    ];

    requiredDeps.forEach(({ name, desc }) => {
      if (allDeps[name]) {
        console.log(chalk.green(`✅ ${name} - ${desc}`));
      } else {
        console.log(chalk.red(`❌ ${name} - ${desc}`));
      }
    });
  } catch (error) {
    console.log(chalk.red('❌ 无法读取package.json'));
  }

  console.log(chalk.blue('\n🪝 检查Git hooks:'));
  
  const hooksDir = path.join(gitRoot, '.git', 'hooks');
  const requiredHooks = [
    { file: 'pre-commit', desc: '提交前检查' },
    { file: 'commit-msg', desc: '提交信息验证' },
    { file: 'pre-push', desc: '推送前检查' }
  ];

  if (fs.existsSync(hooksDir)) {
    requiredHooks.forEach(({ file, desc }) => {
      const hookPath = path.join(hooksDir, file);
      if (fs.existsSync(hookPath)) {
        const stats = fs.statSync(hookPath);
        if (stats.mode & parseInt('111', 8)) { // 检查是否可执行
          console.log(chalk.green(`✅ ${file} - ${desc}`));
        } else {
          console.log(chalk.yellow(`⚠️  ${file} - ${desc} (不可执行)`));
        }
      } else {
        console.log(chalk.red(`❌ ${file} - ${desc}`));
      }
    });
  } else {
    console.log(chalk.red('❌ hooks目录不存在'));
  }

  console.log(chalk.blue('\n📜 检查npm scripts:'));
  
  try {
    const packageJson = fs.readJsonSync(path.join(projectRoot, 'package.json'));
    const scripts = packageJson.scripts || {};
    
    const expectedScripts = [
      { name: 'commit', desc: '交互式提交' },
      { name: 'branch', desc: '创建分支' },
      { name: 'release', desc: '版本发布' },
      { name: 'git:setup', desc: 'Git hooks设置' },
      { name: 'git:fix', desc: 'hooks冲突修复' }
    ];

    expectedScripts.forEach(({ name, desc }) => {
      if (scripts[name]) {
        console.log(chalk.green(`✅ ${name} - ${desc}`));
      } else {
        console.log(chalk.red(`❌ ${name} - ${desc}`));
      }
    });
  } catch (error) {
    console.log(chalk.red('❌ 无法检查npm scripts'));
  }

  console.log(chalk.blue('\n📁 检查辅助脚本:'));
  
  const scriptsDir = path.join(projectRoot, 'scripts');
  const expectedScriptFiles = [
    { file: 'create-branch.sh', desc: '分支创建脚本' },
    { file: 'setup.sh', desc: '快速初始化脚本' },
    { file: 'fix-hooks-conflict.sh', desc: 'hooks冲突修复脚本' }
  ];

  if (fs.existsSync(scriptsDir)) {
    expectedScriptFiles.forEach(({ file, desc }) => {
      const scriptPath = path.join(scriptsDir, file);
      if (fs.existsSync(scriptPath)) {
        const stats = fs.statSync(scriptPath);
        if (stats.mode & parseInt('111', 8)) {
          console.log(chalk.green(`✅ ${file} - ${desc}`));
        } else {
          console.log(chalk.yellow(`⚠️  ${file} - ${desc} (不可执行)`));
        }
      } else {
        console.log(chalk.red(`❌ ${file} - ${desc}`));
      }
    });
  } else {
    console.log(chalk.red('❌ scripts目录不存在'));
  }

  // 总结
  console.log(chalk.blue('\n📊 配置状态总结:'));
  
  const allConfigExists = configFiles.every(({ file }) => 
    fs.existsSync(path.join(projectRoot, file))
  );
  
  if (allConfigExists) {
    console.log(chalk.green('🎉 Git工作流配置完整！'));
    console.log(chalk.blue('💡 使用 npm run commit 开始规范化提交'));
  } else {
    console.log(chalk.yellow('⚠️  配置不完整，建议运行 gitgrove 重新配置'));
  }
}

module.exports = { checkGitWorkflow };
