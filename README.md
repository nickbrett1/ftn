# Financial Technology Portfolio

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/nickbrett1/ftn/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/nickbrett1/ftn/tree/main)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=nickbrett1_bem&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=nickbrett1_bem)

**Live Site:** [www.fintechnick.com](https://www.fintechnick.com)

A developer portfolio website showcasing financial technology expertise through demos, modern web development practices, and production-ready fintech applications.

## 🚀 Technical Highlights

### **Modern Full-Stack Architecture**

- **Frontend**: SvelteKit 5 for reactive, performant UI
- **Styling**: TailwindCSS 4 with custom design system
- **Backend**: Cloudflare Workers for edge computing
- **Database**: Cloudflare D1 (SQLite) for serverless data persistence
- **Storage**: Cloudflare R2 for document and asset management

### **Production DevOps Pipeline**

- **CI/CD**: CircleCI with automated testing, security scanning, and deployment
- **Code Quality**: SonarCloud integration with comprehensive coverage reporting
- **Security**: GitGuardian secret scanning and dependency vulnerability checks
- **Performance**: Lighthouse CI for automated performance monitoring
- **Testing**: Vitest unit testing, Storybook component testing
- **Preview Deployments**: Automatic preview URLs for all feature branches

## 💼 Featured Projects

### **[Project Generator (genproj)](webapp/src/routes/projects/genproj)**

A developer tool to scaffold production-ready applications with selectable capabilities.

- **Key Features**: Dynamic configuration of DevContainers, CI/CD pipelines, and code quality tools.
- **Tech**: SvelteKit, GitHub API, Template Engine.

### **[Personal Finance (ccbilling)](webapp/src/routes/projects/ccbilling)**

Automated budget tracking and statement processing system.

- **Key Features**: AI-driven merchant categorization, PDF parsing, encryption at rest.
- **Tech**: Cloudflare Workers, D1, Llama LLM

### **[Data Analytics (dbt-duckdb)](webapp/src/routes/projects/dbt-duckdb)**

Serverless data warehouse and transformation pipeline.

- **Key Features**: SQL analytics, dbt transformation logic.
- **Tech**: DuckDB, SvelteKit.

## 🛠 Technical Architecture

### **Frontend**

- **Component Library**: Modular, reusable components with Storybook documentation
- **State Management**: Reactive stores and context management
- **Performance**: Code splitting, lazy loading, and optimized bundling
- **Accessibility**: WCAG compliant with semantic HTML and ARIA support
- **PWA Features**: Service workers for offline functionality

### **Backend & Infrastructure**

- **Serverless**: Cloudflare Workers for global edge distribution
- **Database**: D1 SQLite for ACID compliance and performance
- **Authentication**: Secure session management with encrypted cookies
- **API Design**: RESTful endpoints
- **Monitoring**: Real-time error tracking and performance metrics

### **Security & Compliance**

- **Data Protection**: Encrypted storage and transmission
- **Authentication**: Multi-factor authentication support
- **Audit Logging**: Comprehensive activity tracking
- **Vulnerability Management**: Automated dependency scanning
- **Privacy**: GDPR-compliant data handling

## 📊 Project Metrics

- **Test Coverage**: >85% unit and integration test coverage
- **Performance**: Lighthouse scores consistently >95
- **Security**: Zero critical vulnerabilities via automated scanning
- **Deployment**: <2 minute CI/CD pipeline with zero-downtime releases
- **Monitoring**: 99.9% uptime with global CDN distribution

## 🚀 Preview Deployments

Available for non-main branch commits under https://ftn-preview.nick-brett1.workers.dev

## 🎯 Focus

- **Fintech Development**: Financial data analysis, consumer finance
- **Modern Web Technologies**: Latest frameworks, best practices, performance optimization
- **DevOps & Infrastructure**: CI/CD, monitoring, security, scalability
- **User Experience**: Responsive design, accessibility, progressive enhancement
- **Data Engineering**: ETL pipelines, data visualization, analytics

---
