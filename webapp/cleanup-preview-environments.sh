#!/bin/bash
set -e

# Preview Environment Cleanup Script
# This script removes old preview environments to prevent resource exhaustion
# It should be run periodically or triggered by branch deletion events

echo "🧹 Starting preview environment cleanup..."

# Check if wrangler CLI is available
if ! command -v npx &> /dev/null; then
    echo "Error: npx is not available"
    exit 1
fi

# Function to list all preview environments
list_preview_environments() {
    echo "📋 Listing all preview environments..."
    
    # Get list of all environments from wrangler
    # Note: This is a simplified approach - in production you might want to use
    # Cloudflare API to get more accurate information
    npx wrangler env list 2>/dev/null | grep "preview-" || echo "No preview environments found"
}

# Function to remove a specific preview environment
remove_preview_environment() {
    local env_name=$1
    echo "🗑️  Removing preview environment: $env_name"
    
    # Remove the environment
    npx wrangler env delete --env "$env_name" --yes || {
        echo "⚠️  Warning: Could not remove environment $env_name"
        return 1
    }
    
    echo "✅ Successfully removed environment: $env_name"
}

# Function to cleanup old preview environments based on age
cleanup_old_environments() {
    echo "⏰ Looking for old preview environments..."
    
    # This is a placeholder for age-based cleanup logic
    # In a real implementation, you would:
    # 1. Query Cloudflare API for environment creation dates
    # 2. Remove environments older than X days
    # 3. Keep track of which branches are still active
    
    echo "💡 Age-based cleanup requires Cloudflare API integration"
    echo "   For now, manual cleanup is recommended"
}

# Function to cleanup environments for deleted branches
cleanup_deleted_branches() {
    echo "🌿 Checking for deleted branches..."
    
    # Get list of remote branches
    local remote_branches
    remote_branches=$(git branch -r | sed 's/origin\///' | grep -v "HEAD" | grep -v "main" || true)
    
    # Get list of local preview environments (this is a simplified approach)
    local local_envs
    local_envs=$(npx wrangler env list 2>/dev/null | grep "preview-" | awk '{print $1}' || true)
    
    echo "📋 Remote branches:"
    echo "$remote_branches" | sed 's/^/  /'
    
    echo "📋 Local preview environments:"
    echo "$local_envs" | sed 's/^/  /'
    
    # This is where you'd implement the logic to find orphaned environments
    # For now, we'll just show what we found
    echo ""
    echo "💡 To implement automatic cleanup:"
    echo "   1. Compare remote branches with local environments"
    echo "   2. Remove environments for deleted branches"
    echo "   3. Set up webhook for branch deletion events"
}

# Function to show cleanup status
show_status() {
    echo "📊 Preview Environment Status:"
    echo ""
    
    # Count environments
    local env_count
    env_count=$(npx wrangler env list 2>/dev/null | grep -c "preview-" 2>/dev/null | head -1 || echo "0")
    
    echo "🔢 Total preview environments: $env_count"
    echo "🎯 Latest preview environment: latest-preview"
    echo ""
    
    if [ "$env_count" -gt 10 ]; then
        echo "⚠️  Warning: You have many preview environments"
        echo "   Consider running cleanup to free up resources"
    elif [ "$env_count" -gt 5 ]; then
        echo "📈 Moderate number of preview environments"
        echo "   Cleanup recommended soon"
    else
        echo "✅ Healthy number of preview environments"
    fi
}

# Main cleanup logic
main() {
    case "${1:-status}" in
        "list")
            list_preview_environments
            ;;
        "cleanup")
            cleanup_old_environments
            cleanup_deleted_branches
            ;;
        "remove")
            if [ -z "$2" ]; then
                echo "Usage: $0 remove <environment-name>"
                exit 1
            fi
            remove_preview_environment "$2"
            ;;
        "status"|*)
            show_status
            ;;
    esac
}

# Show help if requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Preview Environment Cleanup Script"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  status                    Show cleanup status (default)"
    echo "  list                      List all preview environments"
    echo "  cleanup                   Run cleanup operations"
    echo "  remove <env-name>         Remove specific environment"
    echo "  --help, -h               Show this help"
    echo ""
    echo "Examples:"
    echo "  $0                        # Show status"
    echo "  $0 list                   # List environments"
    echo "  $0 cleanup                # Run cleanup"
    echo "  $0 remove preview-feature # Remove specific environment"
    echo ""
    echo "💡 Tip: Run this script periodically to prevent resource exhaustion"
    exit 0
fi

# Run main function
main "$@"