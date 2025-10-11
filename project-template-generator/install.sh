#!/bin/bash

# Project Template Generator Installation Script

set -e

echo "🚀 Installing Project Template Generator..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Make CLI executable
chmod +x src/cli.js

# Create symlink for global access
if [ "$1" = "--global" ]; then
    echo "🔗 Creating global symlink..."
    sudo ln -sf "$(pwd)/src/cli.js" /usr/local/bin/project-template-generator
    sudo ln -sf "$(pwd)/src/cli.js" /usr/local/bin/ptg
    echo "✅ Global installation complete!"
    echo "   You can now use: project-template-generator or ptg"
else
    echo "✅ Local installation complete!"
    echo "   Use: npx project-template-generator or npm start"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Quick start:"
echo "  npx project-template-generator create my-project"
echo "  npx project-template-generator serve"
echo ""
echo "For more information, see README.md"