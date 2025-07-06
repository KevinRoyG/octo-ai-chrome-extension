# 🚀 Development Workflow - Octopus AI Chrome Extension

This guide simplifies pushing improvements to GitHub and avoiding merge conflicts.

## 📋 Quick Start

### For Small Changes (Direct to Main)
```bash
# Make your changes, then run:
./git-push.sh "your commit message"
```

### For New Features (Recommended)
```bash
# Make your changes, then run:
./new-feature.sh "feature-name" "your commit message"
# Follow the link to create a Pull Request
```

## 🛠️ Available Scripts

### `./git-push.sh "message"`
- Pulls latest changes
- Adds all files
- Commits with your message
- Pushes to main branch
- **Use for**: Bug fixes, small improvements, documentation

### `./new-feature.sh "feature-name" "message"`  
- Creates a new feature branch
- Commits your changes
- Pushes to GitHub
- Provides PR link
- **Use for**: New features, major changes, experimental work

## 📖 Workflow Examples

### Example 1: Fix a Bug
```bash
# Fix the bug in your code, then:
./git-push.sh "fix: resolve API key validation issue"
```

### Example 2: Add New Feature
```bash
# Develop your feature, then:
./new-feature.sh "openai-integration" "feat: add OpenAI GPT integration"
# Click the provided link to create PR
```

### Example 3: Update Documentation
```bash
# Update docs, then:
./git-push.sh "docs: update installation instructions"
```

## 🔄 Branch Management

### Switch Between Branches
```bash
git checkout main           # Switch to main
git checkout feature/name   # Switch to feature branch
```

### See All Branches
```bash
git branch -a              # Show all branches
```

### Delete Feature Branch (after merging)
```bash
git branch -d feature/name  # Delete local branch
```

## 🎯 Best Practices

1. **Always pull before starting**: Scripts handle this automatically
2. **Use descriptive commit messages**: Helps track changes
3. **Feature branches for big changes**: Prevents conflicts
4. **Test locally first**: Make sure extension works
5. **One feature per branch**: Easier to review and merge

## 🆘 If Something Goes Wrong

### Undo Last Commit (before pushing)
```bash
git reset --soft HEAD~1
```

### Start Over from Clean State
```bash
git checkout main
git pull origin main
# Start fresh
```

### Force Update (Use Carefully)
```bash
git push origin main --force-with-lease
```

## 🔗 Useful Links

- **Repository**: https://github.com/KevinRoyG/octo-ai-chrome-extension
- **Issues**: https://github.com/KevinRoyG/octo-ai-chrome-extension/issues
- **Pull Requests**: https://github.com/KevinRoyG/octo-ai-chrome-extension/pulls

---

💡 **Pro Tip**: Use feature branches for anything that takes more than 30 minutes to develop. Use direct pushes for quick fixes and updates.