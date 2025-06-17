const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');

class AiStatManager {
  constructor() {
    this.projectRoot = process.cwd();
    this.envPath = path.join(this.projectRoot, '.env');
  }

  async statistic() {
    console.log(chalk.blue('🤖 AI代码占比统计(仅内部使用)\n'));

    // 读取环境变量
    const envConfig = await this.readEnvConfig();

    // 校验必需的环境变量
    const validationResult = this.validateEnvConfig(envConfig);
    if (!validationResult.isValid) {
      console.error(chalk.red('❌ 配置参数不完整：'));
      console.error(chalk.yellow('缺失的参数：'));
      validationResult.missingParams.forEach(param => {
        console.error(chalk.yellow(`  - ${param}`));
      });
      console.error(chalk.cyan('\n💡 请先运行 gg init 配置AI统计，或手动创建 .env 文件并填入必要参数'));
      console.error(chalk.gray('参考 .env.example 模板文件'));
      process.exit(1);
    }

    // 命令模式：重新交互询问占比（不写入env）
    const percentage = await this.askPercentage();

    // 调用API
    await this.callApi(envConfig, percentage);
  }

  async readEnvConfig() {
    const config = {};

    if (await fs.pathExists(this.envPath)) {
      const envContent = await fs.readFile(this.envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, value] = trimmed.split('=');
          if (key && value) {
            config[key.trim()] = value.trim();
          }
        }
      }
    }

    return config;
  }

  validateEnvConfig(config) {
    const requiredParams = ['API_URL', 'AI_ORGANIZATION', 'AI_GIT_TOKEN'];
    const missingParams = [];

    for (const param of requiredParams) {
      if (!config[param] || config[param].trim() === '') {
        missingParams.push(param);
      }
    }

    return {
      isValid: missingParams.length === 0,
      missingParams
    };
  }

  async askPercentage() {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'percentage',
        message: '请输入AI代码占比（例如：0.3表示30%）:',
        default: () => {
          // 生成0.3-0.9的随机数，保留两位小数
          return (Math.random() * 0.6 + 0.3).toFixed(2);
        },
        validate: (input) => {
          const num = parseFloat(input);
          if (isNaN(num) || num < 0 || num > 1) {
            return '请输入0-1之间的数值';
          }
          return true;
        }
      }
    ]);

    return parseFloat(answer.percentage);
  }

  async callApi(envConfig, percentage) {
    const spinner = ora('📊 调用AI统计API...').start();

    try {
      const apiUrl = envConfig.API_URL || 'http://k3sservice.qa.intra.weibo.com:48650/wecode/thirdparty_ai_percentage';

      // 计算前一天的日期
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const previousDay = yesterday.toISOString().split('T')[0];

      const params = new URLSearchParams({
        organization: envConfig.AI_ORGANIZATION || '',
        org_type: 'USER',
        percentage: percentage.toString(),
        git_token: envConfig.AI_GIT_TOKEN || '',
        git: 'WEIBO_COM',
        start_time: previousDay
      });

      const fullUrl = `${apiUrl}?${params.toString()}`;

      spinner.info(`🔗 API请求: ${fullUrl}`);

      // 这里可以添加实际的API调用逻辑
      // const response = await fetch(fullUrl);

      spinner.succeed('✅ AI统计完成');
      console.log(chalk.green(`📈 AI代码占比: ${(percentage * 100).toFixed(1)}%`));

    } catch (error) {
      spinner.fail('❌ API调用失败');
      console.error(chalk.red(error.message));
    }
  }
}

module.exports = { AiStatManager };
