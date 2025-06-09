#!/usr/bin/env node

// Windows兼容的master分支保护脚本
const { execSync } = require('child_process');

try {
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  
  if (branch === 'master' || branch === 'main') {
    console.log('❌ 错误: 禁止直接向主分支提交!');
    console.log('📋 正确流程:');
    console.log('   1. 创建功能分支: git checkout -b feature_[模块]_[描述]');
    console.log('   2. 在功能分支上开发和提交');
    console.log('   3. 通过Pull Request合并到主分支');
    process.exit(1);
  }
} catch (error) {
  // 如果无法获取分支信息，允许继续
  console.log('⚠️  无法获取分支信息，跳过检查');
}
