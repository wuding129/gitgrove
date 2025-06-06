module.exports = {
  types: [
    { type: 'feat', section: '✨ 新功能' },
    { type: 'fix', section: '🐛 问题修复' },
    { type: 'chore', section: '🔧 构建/工程依赖/工具', hidden: false },
    { type: 'docs', section: '📝 文档', hidden: false },
    { type: 'style', section: '💄 样式', hidden: false },
    { type: 'refactor', section: '♻️ 代码重构', hidden: false },
    { type: 'perf', section: '⚡ 性能优化', hidden: false },
    { type: 'test', section: '✅ 测试', hidden: false },
    { type: 'build', section: '👷 构建系统', hidden: false },
    { type: 'ci', section: '🔄 持续集成', hidden: false }
  ],
  commitUrlFormat: '{{host}}/{{owner}}/{{repository}}/commit/{{hash}}',
  compareUrlFormat: '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',
  issueUrlFormat: '{{host}}/{{owner}}/{{repository}}/issues/{{id}}',
  userUrlFormat: '{{host}}/{{user}}',
  releaseCommitMessageFormat: 'chore(release): {{currentTag}}',
  issuePrefixes: ['#'],
  header: '# 更新日志\n\n自动生成的版本历史记录。\n\n',
  skip: {
    bump: false,
    changelog: false,
    commit: false,
    tag: false
  },
  scripts: {
    prebump: 'echo "准备发布版本..."',
    postbump: 'echo "版本已更新"',
    prechangelog: 'echo "生成更新日志..."',
    postchangelog: 'echo "更新日志已生成"',
    precommit: 'echo "提交版本更新..."',
    postcommit: 'echo "版本提交完成"',
    pretag: 'echo "创建版本标签..."',
    posttag: 'echo "版本标签已创建"'
  }
};