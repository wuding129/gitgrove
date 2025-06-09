#!/usr/bin/env node

// Windows兼容的分支名称检查脚本
const { execSync } = require('child_process');

try {
  // 获取当前分支名
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim() ||
                       execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  
  // 跳过master/main分支的检查
  if (currentBranch === 'master' || currentBranch === 'main') {
    process.exit(0);
  }
  
  // 分支命名规范校验
  const validPatterns = [
    /^feature_.+/,
    /^hotfix_.+/,
    /^bugfix_.+/
  ];
  
  const isValidBranch = validPatterns.some(pattern => pattern.test(currentBranch));
  
  if (isValidBranch) {
    console.log(`✅ 分支名称符合规范: ${currentBranch}`);
    process.exit(0);
  } else {
    console.log(`❌ 错误: 分支名 '${currentBranch}' 不符合规范!`);
    console.log('📋 正确格式:');
    console.log('   🔹 feature_[模块]_[描述] (例: feature_user_login)');
    console.log('   🔹 hotfix_v[版本]_[描述] (例: hotfix_v1.0.3_login_fix)');
    console.log('   🔹 bugfix_[描述] (例: bugfix_scroll_error)');
    console.log('');
    console.log('💡 使用以下命令创建规范分支:');
    console.log('   gg branch 或 gg b (交互式创建分支)');
    process.exit(1);
  }
} catch (error) {
  // 如果无法获取分支信息，允许继续
  console.log('⚠️  无法获取分支信息，跳过检查');
  process.exit(0);
}
