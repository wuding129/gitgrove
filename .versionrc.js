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
  releaseCommitMessageFormat: 'chore: release v{{currentTag}}',
  issuePrefixes: ['#'],
  header: '# 更新日志\n\n自动生成的版本历史记录。\n\n',
  skip: {
    bump: false,
    changelog: false,
    commit: false,
    tag: false
  }
};