# Project Template Generator

A comprehensive tool for generating new projects with common infrastructure patterns from the ftn project. This tool factors out the best practices and configurations from your ftn project into reusable templates that can be used to quickly bootstrap new projects with the same high-quality infrastructure setup.

## 🚀 Features

### Core Infrastructure
- **DevContainer setup** with Node.js, zsh, Oh My Zsh, Powerlevel10k
- **Doppler integration** for secrets management
- **CircleCI pipeline** with build, test, and deploy stages
- **SonarCloud integration** for code quality
- **VS Code/Cursor** configuration with extensions and settings

### Cloud Provider Support
- **Cloudflare Workers**: Wrangler configuration, D1 database, KV storage
- **Google Cloud Platform**: Cloud Run, Cloud SQL, GCS storage
- **Amazon Web Services**: Lambda, RDS, S3 storage

### Framework Support
- **SvelteKit**: Full-stack web framework with Cloudflare Workers
- **Next.js**: React framework for production
- **Express.js**: Fast, unopinionated web framework
- **Fastify**: Fast and low overhead web framework
- **Vanilla JS/TS**: Plain JavaScript or TypeScript

### Development Tools
- ESLint, Prettier configuration
- Testing setup (Jest, Playwright, Vitest)
- TypeScript configuration
- Package.json templates with optimized scripts

## 🛠️ Installation

### Quick Install (Recommended)
```bash
npx project-template-generator create my-new-project
```

### Local Installation
```bash
git clone <this-repo>
cd project-template-generator
npm install
./install.sh
```

### Global Installation
```bash
git clone <this-repo>
cd project-template-generator
./install.sh --global
```

## 🚀 Quick Start

### CLI Usage
```bash
# Interactive mode (recommended)
npx project-template-generator create my-new-project

# Non-interactive mode
npx project-template-generator create my-new-project \
  --template webapp \
  --framework sveltekit \
  --cloud cloudflare \
  --no-interactive
```

### Web UI
```bash
npx project-template-generator serve
# Open http://localhost:3000 in your browser
```

## 📋 Configuration Options

| Option | Description | Choices |
|--------|-------------|---------|
| **Project Type** | Type of project to create | `webapp`, `api`, `library`, `fullstack` |
| **Framework** | Frontend/backend framework | `sveltekit`, `nextjs`, `express`, `fastify`, `none` |
| **Cloud Provider** | Deployment target | `cloudflare`, `gcs`, `aws`, `none` |
| **Database** | Database solution | `d1`, `postgresql`, `mysql`, `mongodb`, `none` |
| **Testing** | Testing framework | `jest-playwright`, `vitest-playwright`, `jest`, `vitest`, `none` |
| **Code Quality** | Quality tools | SonarCloud, ESLint, Prettier |
| **Secrets** | Secrets management | Doppler integration |

## 📁 Generated Project Structure

### SvelteKit + Cloudflare Example
```
my-new-project/
├── .devcontainer/              # Complete devcontainer setup
│   ├── devcontainer.json       # VS Code devcontainer config
│   ├── Dockerfile              # Custom Docker image
│   ├── .zshrc                  # zsh configuration
│   ├── .p10k.zsh              # Powerlevel10k theme
│   └── post-create-setup.sh    # Container setup script
├── .circleci/                  # CI/CD pipeline
│   └── config.yml              # CircleCI configuration
├── .vscode/                    # VS Code/Cursor settings
│   ├── settings.json           # Editor settings
│   ├── extensions.json         # Recommended extensions
│   └── tasks.json              # Build tasks
├── webapp/                     # SvelteKit application
│   ├── src/
│   │   ├── app.html           # HTML template
│   │   ├── app.css            # Global styles
│   │   └── routes/            # SvelteKit routes
│   ├── scripts/
│   │   ├── cloud-login.sh     # Cloud provider login
│   │   └── setup-wrangler-config.sh # Wrangler setup
│   ├── wrangler.template.jsonc # Cloudflare Workers config
│   ├── svelte.config.js       # SvelteKit configuration
│   ├── vite.config.js         # Vite configuration
│   └── package.json           # Dependencies and scripts
├── doppler.yaml               # Doppler secrets config
├── sonar-project.properties   # SonarCloud configuration
├── .gitignore                 # Git ignore rules
├── .eslintrc.js              # ESLint configuration
├── .prettierrc               # Prettier configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project documentation
```

## 🔧 Usage Examples

### Create a SvelteKit Web App
```bash
npx project-template-generator create my-webapp \
  --template webapp \
  --framework sveltekit \
  --cloud cloudflare \
  --no-interactive
```

### Create an Express API
```bash
npx project-template-generator create my-api \
  --template api \
  --framework express \
  --cloud aws \
  --no-interactive
```

### Create a Library Package
```bash
npx project-template-generator create my-library \
  --template library \
  --framework none \
  --cloud none \
  --no-interactive
```

## 🌐 Web UI Features

The web interface provides a modern, interactive way to generate projects:

- **Visual Configuration**: Fill out forms instead of command-line arguments
- **GitHub Integration**: Create repositories and set up webhooks
- **CircleCI Setup**: Automatically configure CI/CD pipelines
- **Real-time Preview**: See configuration changes as you type
- **Template Browser**: Explore available templates and configurations

## 🚀 Next Steps After Generation

1. **Open in DevContainer**
   ```bash
   code my-new-project  # or cursor my-new-project
   ```

2. **Set up Secrets Management**
   ```bash
   doppler login
   doppler setup --project my-new-project --config dev
   ```

3. **Configure Cloud Provider**
   ```bash
   # For Cloudflare
   npx wrangler login
   
   # For Google Cloud
   gcloud auth login
   
   # For AWS
   aws configure
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

6. **Set up CI/CD**
   - Push to GitHub
   - Connect repository to CircleCI
   - Configure environment variables

## 📚 Documentation

- [Usage Guide](USAGE.md) - Detailed usage instructions
- [Examples](EXAMPLES.md) - Real-world usage examples
- [API Reference](docs/API.md) - Programmatic API documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

This project is based on the infrastructure patterns and best practices from the ftn project, providing a way to share these patterns across multiple projects.