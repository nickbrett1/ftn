#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const ProjectGenerator = require('./generator');

class CLI {
  constructor() {
    this.generator = new ProjectGenerator();
  }

  async run() {
    const argv = yargs(hideBin(process.argv))
      .command('create <name>', 'Create a new project', (yargs) => {
        yargs.positional('name', {
          describe: 'Project name',
          type: 'string'
        });
      })
      .option('interactive', {
        alias: 'i',
        type: 'boolean',
        description: 'Run in interactive mode',
        default: true
      })
      .option('template', {
        alias: 't',
        type: 'string',
        description: 'Template to use',
        choices: ['api', 'webapp', 'library', 'fullstack']
      })
      .option('cloud', {
        alias: 'c',
        type: 'string',
        description: 'Cloud provider',
        choices: ['cloudflare', 'gcs', 'aws', 'none']
      })
      .option('framework', {
        alias: 'f',
        type: 'string',
        description: 'Framework',
        choices: ['sveltekit', 'nextjs', 'express', 'fastify', 'none']
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output directory',
        default: process.cwd()
      })
      .option('yes', {
        alias: 'y',
        type: 'boolean',
        description: 'Skip confirmation prompts',
        default: false
      })
      .help()
      .argv;

    try {
      if (argv._[0] === 'create') {
        await this.createProject(argv);
      } else {
        console.log(chalk.red('Unknown command. Use --help for available commands.'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  async createProject(argv) {
    const projectName = argv.name;
    const outputDir = path.resolve(argv.output, projectName);

    // Check if directory already exists
    if (await fs.pathExists(outputDir)) {
      if (!argv.yes) {
        const { overwrite } = await inquirer.prompt([{
          type: 'confirm',
          name: 'overwrite',
          message: `Directory ${outputDir} already exists. Overwrite?`,
          default: false
        }]);
        
        if (!overwrite) {
          console.log(chalk.yellow('Operation cancelled.'));
          return;
        }
      }
    }

    let config = {};

    if (argv.interactive) {
      config = await this.promptForConfiguration(projectName);
    } else {
      config = this.buildConfigFromArgs(argv, projectName);
    }

    const spinner = ora('Generating project...').start();

    try {
      await this.generator.generateProject(projectName, outputDir, config);
      spinner.succeed(chalk.green(`Project ${projectName} generated successfully!`));
      
      this.printNextSteps(projectName, outputDir, config);
    } catch (error) {
      spinner.fail(chalk.red('Failed to generate project:'), error.message);
      throw error;
    }
  }

  async promptForConfiguration(projectName) {
    console.log(chalk.blue(`\n🚀 Setting up project: ${projectName}\n`));

    const questions = [
      {
        type: 'list',
        name: 'projectType',
        message: 'What type of project is this?',
        choices: [
          { name: 'Web Application (with UI)', value: 'webapp' },
          { name: 'API/Backend Service', value: 'api' },
          { name: 'Library/Package', value: 'library' },
          { name: 'Full-stack Application', value: 'fullstack' }
        ],
        default: 'webapp'
      },
      {
        type: 'list',
        name: 'framework',
        message: 'Which framework would you like to use?',
        choices: [
          { name: 'SvelteKit', value: 'sveltekit' },
          { name: 'Next.js', value: 'nextjs' },
          { name: 'Express.js', value: 'express' },
          { name: 'Fastify', value: 'fastify' },
          { name: 'None (vanilla JS/TS)', value: 'none' }
        ],
        default: 'sveltekit'
      },
      {
        type: 'list',
        name: 'cloudProvider',
        message: 'Which cloud provider would you like to use?',
        choices: [
          { name: 'Cloudflare Workers', value: 'cloudflare' },
          { name: 'Google Cloud Platform', value: 'gcs' },
          { name: 'Amazon Web Services', value: 'aws' },
          { name: 'None (local development only)', value: 'none' }
        ],
        default: 'cloudflare'
      },
      {
        type: 'list',
        name: 'database',
        message: 'Which database would you like to use?',
        choices: [
          { name: 'Cloudflare D1 (SQLite)', value: 'd1' },
          { name: 'PostgreSQL', value: 'postgresql' },
          { name: 'MySQL', value: 'mysql' },
          { name: 'MongoDB', value: 'mongodb' },
          { name: 'None', value: 'none' }
        ],
        default: 'd1'
      },
      {
        type: 'list',
        name: 'testingFramework',
        message: 'Which testing framework would you like to use?',
        choices: [
          { name: 'Jest + Playwright', value: 'jest-playwright' },
          { name: 'Vitest + Playwright', value: 'vitest-playwright' },
          { name: 'Jest only', value: 'jest' },
          { name: 'Vitest only', value: 'vitest' },
          { name: 'None', value: 'none' }
        ],
        default: 'jest-playwright'
      },
      {
        type: 'confirm',
        name: 'includeSonarCloud',
        message: 'Include SonarCloud for code quality analysis?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeDoppler',
        message: 'Include Doppler for secrets management?',
        default: true
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        default: `A ${projectName} project`
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author name:',
        default: process.env.USER || 'Developer'
      },
      {
        type: 'input',
        name: 'sentryOrg',
        message: 'Sentry organization (for error tracking):',
        default: 'your-org'
      }
    ];

    const answers = await inquirer.prompt(questions);

    return {
      projectName,
      ...answers,
      // Derived configurations
      sveltekit: answers.framework === 'sveltekit',
      nextjs: answers.framework === 'nextjs',
      express: answers.framework === 'express',
      fastify: answers.framework === 'fastify',
      cloudflare: answers.cloudProvider === 'cloudflare',
      gcs: answers.cloudProvider === 'gcs',
      aws: answers.cloudProvider === 'aws',
      jest: answers.testingFramework.includes('jest'),
      vitest: answers.testingFramework.includes('vitest'),
      playwright: answers.testingFramework.includes('playwright'),
      forwardPorts: this.getForwardPorts(answers.framework),
      year: new Date().getFullYear()
    };
  }

  buildConfigFromArgs(argv, projectName) {
    return {
      projectName,
      projectType: argv.template || 'webapp',
      framework: argv.framework || 'sveltekit',
      cloudProvider: argv.cloud || 'cloudflare',
      database: 'd1',
      testingFramework: 'jest-playwright',
      includeSonarCloud: true,
      includeDoppler: true,
      description: `A ${projectName} project`,
      author: process.env.USER || 'Developer',
      sentryOrg: 'your-org',
      // Derived configurations
      sveltekit: argv.framework === 'sveltekit',
      nextjs: argv.framework === 'nextjs',
      express: argv.framework === 'express',
      fastify: argv.framework === 'fastify',
      cloudflare: argv.cloud === 'cloudflare',
      gcs: argv.cloud === 'gcs',
      aws: argv.cloud === 'aws',
      jest: true,
      vitest: false,
      playwright: true,
      forwardPorts: this.getForwardPorts(argv.framework),
      year: new Date().getFullYear()
    };
  }

  getForwardPorts(framework) {
    const portMap = {
      'sveltekit': '5173, 4173',
      'nextjs': '3000, 3001',
      'express': '3000, 3001',
      'fastify': '3000, 3001',
      'none': '3000'
    };
    return portMap[framework] || '3000';
  }

  printNextSteps(projectName, outputDir, config) {
    console.log(chalk.blue('\n📋 Next Steps:\n'));
    
    console.log(chalk.white('1. Navigate to your project:'));
    console.log(chalk.gray(`   cd ${outputDir}`));
    
    console.log(chalk.white('\n2. Open in VS Code/Cursor with devcontainer:'));
    console.log(chalk.gray(`   code ${outputDir}`));
    console.log(chalk.gray('   # or'));
    console.log(chalk.gray(`   cursor ${outputDir}`));
    
    if (config.includeDoppler) {
      console.log(chalk.white('\n3. Set up Doppler:'));
      console.log(chalk.gray('   doppler login'));
      console.log(chalk.gray(`   doppler setup --project ${projectName} --config dev`));
    }
    
    if (config.cloudflare) {
      console.log(chalk.white('\n4. Set up Cloudflare:'));
      console.log(chalk.gray('   npx wrangler login'));
      console.log(chalk.gray('   # Configure your wrangler.toml file'));
    }
    
    if (config.gcs) {
      console.log(chalk.white('\n4. Set up Google Cloud:'));
      console.log(chalk.gray('   gcloud auth login'));
      console.log(chalk.gray('   gcloud config set project YOUR_PROJECT_ID'));
    }
    
    if (config.aws) {
      console.log(chalk.white('\n4. Set up AWS:'));
      console.log(chalk.gray('   aws configure'));
    }
    
    console.log(chalk.white('\n5. Install dependencies and start development:'));
    console.log(chalk.gray('   npm install'));
    console.log(chalk.gray('   npm run dev'));
    
    console.log(chalk.white('\n6. Set up CircleCI:'));
    console.log(chalk.gray('   - Push to GitHub'));
    console.log(chalk.gray('   - Connect repository to CircleCI'));
    console.log(chalk.gray('   - Configure environment variables in CircleCI'));
    
    if (config.includeSonarCloud) {
      console.log(chalk.white('\n7. Set up SonarCloud:'));
      console.log(chalk.gray('   - Create SonarCloud project'));
      console.log(chalk.gray('   - Add SONAR_TOKEN to CircleCI environment variables'));
    }
    
    console.log(chalk.green('\n🎉 Happy coding!\n'));
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new CLI();
  cli.run();
}

module.exports = CLI;