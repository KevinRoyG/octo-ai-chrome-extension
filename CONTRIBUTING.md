# Contributing to Octopus AI Chrome Extension

Thank you for your interest in contributing! This project is part of my journey in building AI productivity tools, and I welcome collaboration from the community.

## 🎯 Project Goals

- Create a production-ready Chrome extension for AI-enhanced productivity
- Build an open-source tool that demonstrates best practices
- Share the development journey for educational purposes
- Foster a community around AI productivity tools

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Chrome browser for testing
- Basic knowledge of JavaScript and Chrome extensions
- OpenRouter API account for testing

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/octopus-ai-chrome-extension.git`
3. Install dependencies: `npm install`
4. Start development mode: `npm run dev`
5. Load the extension in Chrome (see README for instructions)

## 📋 Development Process

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/feature-name`: Individual feature development
- `hotfix/issue-description`: Critical bug fixes

### Commit Convention

Use conventional commits format:
```
type(scope): brief description

Examples:
feat(api): add OpenRouter integration
fix(popup): resolve keyboard shortcut conflicts
docs(readme): update installation instructions
test(utils): add unit tests for API helpers
```

### Pull Request Process

1. Create a feature branch from `develop`
2. Make your changes with appropriate tests
3. Update documentation if needed
4. Run linting: `npm run lint:fix`
5. Run tests: `npm test`
6. Submit PR to `develop` branch

## 🧪 Testing

### Running Tests
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
```

### Test Requirements
- All new features must include tests
- Maintain minimum 80% code coverage
- Test both happy path and error scenarios

## 📝 Code Style

### JavaScript Standards
- ES6+ syntax preferred
- Use `const` and `let`, avoid `var`
- Async/await over promises when possible
- Meaningful variable and function names

### Chrome Extension Best Practices
- Follow Manifest V3 guidelines
- Minimize permissions requested
- Handle errors gracefully
- Respect user privacy

### Documentation
- JSDoc comments for functions
- README updates for new features
- Inline comments for complex logic

## 🎨 Design Principles

### User Experience
- Fast and responsive interactions
- Minimal UI disruption
- Keyboard shortcuts for power users
- Clear error messages and feedback

### Technical Architecture
- Modular, testable code
- Clean separation of concerns
- Efficient API usage
- Secure credential handling

## 🐛 Issue Reporting

### Bug Reports
Include:
- Chrome version and OS
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)

### Feature Requests
Include:
- Use case description
- Proposed solution
- Alternative approaches considered
- Mockups or examples (if applicable)

## 📚 Resources

### Chrome Extension Development
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

### API Integration
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [API Best Practices Guide](docs/api/best-practices.md)

## 🤝 Community

### Communication
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: General questions and ideas
- LinkedIn: Follow development updates

### Recognition
Contributors will be:
- Listed in the README contributors section
- Mentioned in release notes
- Credited in documentation they improve

## 📋 Current Priorities

### High Priority
- [ ] Complete OpenRouter API integration
- [ ] Implement keyboard shortcuts system
- [ ] Add comprehensive error handling
- [ ] Create user onboarding flow

### Medium Priority
- [ ] Multi-model switching interface
- [ ] Advanced context understanding
- [ ] Performance optimizations
- [ ] Accessibility improvements

### Help Wanted
- UI/UX design improvements
- Documentation enhancements
- Test coverage expansion
- Performance optimization

## 🚀 Development Roadmap

See the main [README](README.md) for detailed roadmap and current status.

---

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for helping build better AI productivity tools! 🎉
