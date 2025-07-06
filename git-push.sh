#!/bin/bash

# Simple Git Push Script for Octopus AI Chrome Extension
# Usage: ./git-push.sh "commit message"

set -e  # Exit on any error

echo "🔄 Octopus AI - Simple Git Push"
echo "================================"

# Check if commit message provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide a commit message"
    echo "Usage: ./git-push.sh \"your commit message\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "📥 Step 1: Pulling latest changes..."
git pull origin main

echo "📦 Step 2: Adding all changes..."
git add .

echo "💬 Step 3: Committing with message: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "🚀 Step 4: Pushing to GitHub..."
git push origin main

echo "✅ Successfully pushed to GitHub!"
echo "🔗 Repository: https://github.com/KevinRoyG/octo-ai-chrome-extension"