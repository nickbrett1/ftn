const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs-extra');
const { SimpleGit } = require('simple-git');
const axios = require('axios');

const ProjectGenerator = require('../generator');

class WebUIServer {
  constructor() {
    this.app = express();
    this.generator = new ProjectGenerator();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  setupRoutes() {
    // Serve the main HTML page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Generate project endpoint
    this.app.post('/api/generate', async (req, res) => {
      try {
        const { projectName, config, options } = req.body;
        
        if (!projectName || !config) {
          return res.status(400).json({ error: 'Project name and config are required' });
        }

        // Create temporary directory for generation
        const tempDir = path.join(__dirname, '..', '..', 'temp', projectName);
        await fs.ensureDir(tempDir);

        // Generate the project
        await this.generator.generateProject(projectName, tempDir, config);

        // If GitHub integration is requested
        if (options?.createGitHubRepo) {
          await this.createGitHubRepository(projectName, tempDir, config, options);
        }

        // If CircleCI setup is requested
        if (options?.setupCircleCI) {
          await this.setupCircleCI(projectName, config, options);
        }

        res.json({
          success: true,
          message: `Project ${projectName} generated successfully!`,
          projectPath: tempDir,
          nextSteps: this.getNextSteps(projectName, config, options)
        });

      } catch (error) {
        console.error('Error generating project:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get project templates
    this.app.get('/api/templates', (req, res) => {
      const templates = {
        frameworks: [
          { id: 'sveltekit', name: 'SvelteKit', description: 'Full-stack web framework' },
          { id: 'nextjs', name: 'Next.js', description: 'React framework for production' },
          { id: 'express', name: 'Express.js', description: 'Fast, unopinionated web framework' },
          { id: 'fastify', name: 'Fastify', description: 'Fast and low overhead web framework' },
          { id: 'none', name: 'Vanilla JS/TS', description: 'Plain JavaScript or TypeScript' }
        ],
        cloudProviders: [
          { id: 'cloudflare', name: 'Cloudflare Workers', description: 'Edge computing platform' },
          { id: 'gcs', name: 'Google Cloud Platform', description: 'Google Cloud services' },
          { id: 'aws', name: 'Amazon Web Services', description: 'AWS cloud services' },
          { id: 'none', name: 'Local Development', description: 'No cloud deployment' }
        ],
        databases: [
          { id: 'd1', name: 'Cloudflare D1', description: 'SQLite-compatible database' },
          { id: 'postgresql', name: 'PostgreSQL', description: 'Advanced open source database' },
          { id: 'mysql', name: 'MySQL', description: 'Popular open source database' },
          { id: 'mongodb', name: 'MongoDB', description: 'Document database' },
          { id: 'none', name: 'None', description: 'No database' }
        ],
        testingFrameworks: [
          { id: 'jest-playwright', name: 'Jest + Playwright', description: 'Unit and E2E testing' },
          { id: 'vitest-playwright', name: 'Vitest + Playwright', description: 'Fast unit and E2E testing' },
          { id: 'jest', name: 'Jest only', description: 'Unit testing only' },
          { id: 'vitest', name: 'Vitest only', description: 'Fast unit testing only' },
          { id: 'none', name: 'None', description: 'No testing framework' }
        ]
      };

      res.json(templates);
    });

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  async createGitHubRepository(projectName, tempDir, config, options) {
    try {
      // Initialize git repository
      const git = new SimpleGit(tempDir);
      await git.init();
      await git.add('.');
      await git.commit('Initial commit');

      // Create GitHub repository using GitHub API
      if (options.githubToken) {
        const response = await axios.post('https://api.github.com/user/repos', {
          name: projectName,
          description: config.description,
          private: options.privateRepo || false,
          auto_init: false
        }, {
          headers: {
            'Authorization': `token ${options.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        // Add remote and push
        await git.addRemote('origin', response.data.clone_url);
        await git.push('origin', 'main');

        console.log(`GitHub repository created: ${response.data.html_url}`);
      }
    } catch (error) {
      console.error('Error creating GitHub repository:', error);
      throw error;
    }
  }

  async setupCircleCI(projectName, config, options) {
    try {
      // This would integrate with CircleCI API to set up the project
      // For now, we'll just log the configuration that would be needed
      console.log('CircleCI setup would be configured with:');
      console.log('- Project name:', projectName);
      console.log('- Cloud provider:', config.cloudProvider);
      console.log('- Framework:', config.framework);
      
      // In a real implementation, you would:
      // 1. Use CircleCI API to create a project
      // 2. Set up environment variables
      // 3. Configure webhooks
      // 4. Set up deployment contexts
    } catch (error) {
      console.error('Error setting up CircleCI:', error);
      throw error;
    }
  }

  getNextSteps(projectName, config, options) {
    const steps = [
      `Navigate to your project: cd ${projectName}`,
      'Open in VS Code/Cursor with devcontainer support',
      'Set up Doppler: doppler login && doppler setup'
    ];

    if (config.cloudProvider === 'cloudflare') {
      steps.push('Set up Cloudflare: npx wrangler login');
    } else if (config.cloudProvider === 'gcs') {
      steps.push('Set up Google Cloud: gcloud auth login');
    } else if (config.cloudProvider === 'aws') {
      steps.push('Set up AWS: aws configure');
    }

    steps.push('Install dependencies: npm install');
    steps.push('Start development: npm run dev');

    if (options?.createGitHubRepo) {
      steps.push('Push to GitHub: git push origin main');
    }

    if (options?.setupCircleCI) {
      steps.push('Configure CircleCI environment variables');
    }

    return steps;
  }

  start(port = 3000) {
    this.app.listen(port, () => {
      console.log(`🚀 Project Template Generator running at http://localhost:${port}`);
      console.log('📝 Open your browser to start generating projects!');
    });
  }
}

// Start server if this file is executed directly
if (require.main === module) {
  const server = new WebUIServer();
  server.start();
}

module.exports = WebUIServer;