# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Octopus AI Chrome Extension** is a sophisticated AI-powered productivity tool that combines multiple AI models for text processing with advanced text-to-speech capabilities. The extension integrates with DeepInfra API to provide grammar correction, custom AI actions, and multilingual speech synthesis.

## Core Features

- **Multi-model AI support** via DeepInfra API (Claude, GPT, Gemini, Mistral, DeepSeek, Llama models)
- **Advanced text-to-speech** with multilingual voice support and word-level timing
- **Grammar correction** and text improvement
- **Customizable AI actions** with user-defined prompts
- **Context menu integration** for selected text processing
- **Speech synthesis** with automatic language detection
- **Options panel** for API key management and action configuration

## Development Commands

- `npm install` - Install dependencies
- `npm run build` - Build production version to `dist/` folder
- `npm run build:dev` - Build development version with source maps
- `npm run dev` or `npm run watch` - Watch mode for development
- `npm run lint` - Run ESLint on all JavaScript files
- `npm run lint:fix` - Auto-fix linting issues
- `npm run test` - Run Jest tests
- `npm run clean` - Remove dist folder

## Project Structure

```
├── manifest.json           # Chrome extension manifest (v3)
├── background/
│   └── background.js       # Service worker with AI API integration
├── content/
│   ├── content.js         # Content script (large file ~43k tokens)
│   └── content.css        # Content script styles
├── popup/
│   ├── popup.html         # Extension popup interface
│   ├── popup.js           # Popup logic with action management
│   ├── popup.css          # Main popup styles
│   └── css/
│       └── popup.css      # Additional popup styles
├── options/
│   ├── options.html       # Options page
│   ├── options.js         # Options page logic
│   └── options.css        # Options page styles
├── utils/
│   └── api.js            # API utilities (currently empty)
├── assets/
│   ├── icons/            # Extension icons (16, 32, 48, 128px + SVG)
│   └── audio/            # Audio assets
└── webpack.config.js     # Webpack build configuration
```

## API Integration

### DeepInfra API
- **Base URL**: `https://api.deepinfra.com/v1/`
- **Text Processing**: `/openai/chat/completions` endpoint
- **Text-to-Speech**: `/inference/hexgrad/Kokoro-82M` endpoint
- **Authentication**: Bearer token via user-provided API key
- **Storage**: API key stored in `chrome.storage.sync`

### Supported AI Models
- Claude 3.7 Sonnet, Claude 4 Sonnet
- Gemini 2.0 Flash
- Mistral variants (Small 3.1 24B, Devstral Small 2505)
- Llama 4 Maverick 17B
- DeepSeek R1 variants

## Language Support

The extension includes sophisticated language detection for 8 languages:
- English (en) - Voice: af_heart
- French (fr) - Voice: ff_siwis  
- Spanish (es) - Voice: ef_dora
- Italian (it) - Voice: if_sara
- Portuguese (pt) - Voice: pf_dora
- Japanese (ja) - Voice: jf_alpha
- Chinese (zh) - Voice: zf_xiaobei
- Hindi (hi) - Voice: hf_alpha

## Architecture Notes

- **Manifest V3** service worker architecture
- **Content script** handles DOM manipulation and user interface
- **Background script** manages API calls and message passing
- **Popup** provides configuration interface
- **Options page** for detailed settings management
- **Context menus** for text selection actions
- **Storage sync** for user preferences and API keys

## Development Considerations

- Content script is very large (~43k tokens) - use Read tool with offset/limit for specific sections
- Extension uses modern Chrome APIs (scripting, contextMenus, storage)
- Text-to-speech includes word-level timing for synchronized highlighting
- Multiple voice models with quality grades (A, B-, C+, C)
- Sophisticated language pattern matching for auto-detection
- Error handling for API failures and missing keys