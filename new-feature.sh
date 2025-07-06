#!/bin/bash

# Feature Branch Script for Octopus AI Chrome Extension
# Usage: ./new-feature.sh "feature-name" "commit message"

set -e  # Exit on any error

echo "🌟 Octopus AI - New Feature Branch"
echo "=================================="

# Check if feature name provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide a feature name"
    echo "Usage: ./new-feature.sh \"feature-name\" \"commit message\""
    echo "Example: ./new-feature.sh \"add-new-models\" \"Add support for new AI models\""
    exit 1
fi

# Check if commit message provided
if [ -z "$2" ]; then
    echo "❌ Error: Please provide a commit message"
    echo "Usage: ./new-feature.sh \"feature-name\" \"commit message\""
    exit 1
fi

FEATURE_NAME="$1"
COMMIT_MESSAGE="$2"
BRANCH_NAME="feature/$FEATURE_NAME"

echo "📥 Step 1: Pulling latest main branch..."
git checkout main
git pull origin main

echo "🌿 Step 2: Creating feature branch '$BRANCH_NAME'..."
git checkout -b "$BRANCH_NAME"

echo "📦 Step 3: Adding all changes..."
git add .

echo "💬 Step 4: Committing with message: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "🚀 Step 5: Pushing feature branch to GitHub..."
git push -u origin "$BRANCH_NAME"

echo "✅ Feature branch created and pushed!"
echo "🔗 Create PR at: https://github.com/KevinRoyG/octo-ai-chrome-extension/compare/$BRANCH_NAME"
echo ""
echo "📝 Next steps:"
echo "   1. Open the PR link above"
echo "   2. Review your changes"
echo "   3. Click 'Create Pull Request'"
echo "   4. Merge when ready"