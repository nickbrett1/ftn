#!/bin/bash

# Amazon Orders Worker Setup Script
# This script helps set up the Amazon Orders Worker for Cloudflare

echo "🚀 Amazon Orders Worker Setup"
echo "============================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
else
    echo "✅ Wrangler CLI found"
fi

# Check if logged in to Cloudflare
echo ""
echo "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "📝 Please log in to Cloudflare:"
    wrangler login
else
    echo "✅ Already logged in to Cloudflare"
fi

# Create KV namespace
echo ""
echo "Creating KV namespace for caching..."
echo "Creating KV namespace..."
KV_OUTPUT=$(wrangler kv namespace create "AMAZON_CACHE" 2>&1)
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+')

if [ -n "$KV_ID" ]; then
    echo "✅ Created KV namespace with ID: $KV_ID"
    echo ""
    echo "📝 Update your wrangler.toml with:"
    echo "[[kv_namespaces]]"
    echo "binding = \"AMAZON_CACHE\""
    echo "id = \"$KV_ID\""
else
    echo "⚠️  Failed to create KV namespace. You may need to create it manually."
    echo "Error output: $KV_OUTPUT"
fi

# Create D1 database
echo ""
echo "Creating D1 database for order history..."
echo "Creating D1 database..."
D1_OUTPUT=$(wrangler d1 create amazon-orders-db 2>&1)
D1_ID=$(echo "$D1_OUTPUT" | grep -oP 'database_id = \K[a-z0-9-]+')

if [ -n "$D1_ID" ]; then
    echo "✅ Created D1 database with ID: $D1_ID"
    echo ""
    echo "📝 Update your wrangler.toml with:"
    echo "[[d1_databases]]"
    echo "binding = \"ORDERS_DB\""
    echo "database_name = \"amazon-orders-db\""
    echo "database_id = \"$D1_ID\""
else
    echo "⚠️  Failed to create D1 database. You may need to create it manually."
    echo "Error output: $D1_OUTPUT"
fi

# Set up secrets
echo ""
echo "Setting up secrets..."
echo "⚠️  You'll need your Amazon account credentials"
echo ""

read -p "Do you want to set up Amazon credentials now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting AMAZON_EMAIL secret..."
    wrangler secret put AMAZON_EMAIL
    
    echo ""
    echo "Setting AMAZON_PASSWORD secret..."
    wrangler secret put AMAZON_PASSWORD
    
    echo ""
    echo "✅ Secrets configured"
else
    echo "⚠️  Remember to set secrets later with:"
    echo "  wrangler secret put AMAZON_EMAIL"
    echo "  wrangler secret put AMAZON_PASSWORD"
fi

# Deploy option
echo ""
echo "Setup complete!"
echo ""
read -p "Do you want to deploy the worker now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying worker..."
    wrangler deploy
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Worker deployed successfully!"
        echo ""
        echo "Your worker URL will be displayed above."
        echo "Add this URL to your main app's environment variables as:"
        echo "  AMAZON_ORDERS_WORKER_URL=<your-worker-url>"
    else
        echo "❌ Deployment failed. Please check the error messages above."
    fi
else
    echo "To deploy later, run: wrangler deploy"
fi

echo ""
echo "🎉 Setup process complete!"
echo ""
echo "Next steps:"
echo "1. Update wrangler.toml with the IDs shown above (if needed)"
echo "2. Deploy the worker: wrangler deploy"
echo "3. Add the worker URL to your main app's environment"
echo "4. Test the integration with: curl <worker-url>/health"
