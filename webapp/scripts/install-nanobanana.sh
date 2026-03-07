#!/bin/bash
set -e

# Define installation directory
INSTALL_DIR="/home/node/nanobanana-mcp"

# Check if already installed to avoid redundant work during rebuilds if volume is persisted
if [ -d "$INSTALL_DIR" ]; then
    echo "Nanobanana MCP is already installed at $INSTALL_DIR"
    exit 0
fi

echo "Installing Nanobanana MCP..."

# Clone the repository
git clone https://github.com/gemini-cli-extensions/nanobanana "$INSTALL_DIR"

# Build the extension
cd "$INSTALL_DIR"
echo "Installing dependencies..."
npm install
echo "Building extension..."
npm run build

echo "Nanobanana MCP installed successfully!"