module.exports = {
  // 提交类型
  types: [
    { value: 'feat', name: '✨ feat:     新功能' },
    { value: 'fix', name: '🐛 fix:      修复bug' },
    { value: 'docs', name: '📝 docs:     文档更新' },
    { value: 'style', name: '💄 style:    代码格式(不影响代码运行的变动)' },
    { value: 'refactor', name: '♻️  refactor: 代码重构(既不是新增功能，也不是修改bug)' },
    { value: 'perf', name: '⚡ perf:     性能优化' },
    { value: 'test', name: '✅ test:     添加测试' },
    { value: 'chore', name: '🔧 chore:    构建过程或辅助工具的变动' },
    { value: 'build', name: '🔨 build:    构建系统或外部依赖的变动' },
    { value: 'ci', name: '🔄 ci:       CI配置文件和脚本的变动' }
  ],

  // 影响范围
  scopes: [
    { name: '组件' },
    { name: '工具' },
    { name: '样式' },
    { name: '依赖' },
    { name: '配置' },
    { name: '文档' },
    { name: '测试' },
    { name: '其他' }
  ],

  // 使用自定义范围
  allowCustomScopes: true,
  
  // 允许空范围
  allowEmptyScopes: true,
  
  // 允许破坏性变更
  allowBreakingChanges: ['feat', 'fix'],
  
  // 跳过问题
  skipQuestions: [
    'scope',
    'customScope',
    'body',
    'breaking',
    'footer'
  ],

  // 消息配置
  messages: {
    type: '选择提交类型:',
    scope: '选择影响范围 (可选):',
    customScope: '输入自定义范围:',
    subject: '输入描述 (无字符限制):',
    body: '输入详细描述 (可选, 按回车跳过):',
    breaking: '列出破坏性变更 (可选):',
    footer: '列出关联的issue (可选, 如: #31, #34):',
    confirmCommit: '确认提交以上内容?'
  },

  // 主题长度限制 - 设置为0表示无限制
  subjectLimit: 0,
  
  // 正文换行长度 - 设置为0表示无限制  
  bodyLineLength: 0,
  
  // 页脚换行长度 - 设置为0表示无限制
  footerLineLength: 0
};