// API Utility Functions for OpenRouter and DeepInfra

/**
 * Determines the API provider based on the model name
 * @param {string} modelName - The model identifier
 * @returns {string} - 'openrouter' or 'deepinfra'
 */
function getApiProvider(modelName) {
    // OpenRouter models typically use specific formats
    const openRouterModels = [
        'openai/', 'anthropic/claude-3-5-', 'google/gemini-pro-',
        'meta-llama/llama-3.1-', 'mistralai/mistral-7b-',
        'deepseek/deepseek-chat'
    ];
    
    // Check if the model matches OpenRouter patterns
    if (openRouterModels.some(pattern => modelName.includes(pattern))) {
        return 'openrouter';
    }
    
    // Default to DeepInfra for existing models
    return 'deepinfra';
}

/**
 * Get the appropriate API key for the provider
 * @param {string} provider - 'openrouter' or 'deepinfra'
 * @returns {Promise<string>} - API key
 */
async function getApiKey(provider) {
    return new Promise((resolve) => {
        const keyName = provider === 'openrouter' ? 'openrouterApiKey' : 'deepinfraApiKey';
        chrome.storage.sync.get([keyName], function(result) {
            resolve(result[keyName] || '');
        });
    });
}

/**
 * Make API request to OpenRouter
 * @param {string} model - Model identifier
 * @param {Array} messages - Chat messages
 * @param {string} apiKey - OpenRouter API key
 * @returns {Promise<Object>} - API response
 */
async function makeOpenRouterRequest(model, messages, apiKey) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://octopus-ai.com/',
            'X-Title': 'Octo AI Chrome Extension'
        },
        body: JSON.stringify({
            model: model,
            messages: messages
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API request failed with status ${response.status}: ${errorText}`);
    }

    return await response.json();
}

/**
 * Make API request to DeepInfra
 * @param {string} model - Model identifier
 * @param {Array} messages - Chat messages
 * @param {string} apiKey - DeepInfra API key
 * @returns {Promise<Object>} - API response
 */
async function makeDeepInfraRequest(model, messages, apiKey) {
    const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: messages
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepInfra API request failed with status ${response.status}: ${errorText}`);
    }

    return await response.json();
}

/**
 * Universal API request function that routes to the appropriate provider
 * @param {string} model - Model identifier
 * @param {Array} messages - Chat messages
 * @param {string} chatId - Optional chat ID for conversation context
 * @returns {Promise<Object>} - API response
 */
async function makeApiRequest(model, messages, chatId = null) {
    const provider = getApiProvider(model);
    const apiKey = await getApiKey(provider);
    
    if (!apiKey) {
        throw new Error(`No API key found for ${provider}. Please add your ${provider} API key in the extension settings.`);
    }

    let response;
    if (provider === 'openrouter') {
        response = await makeOpenRouterRequest(model, messages, apiKey);
    } else {
        // Add chat_id to the request body for DeepInfra if provided
        const body = { model, messages };
        if (chatId) body.chat_id = chatId;
        
        const deepInfraResponse = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!deepInfraResponse.ok) {
            const errorText = await deepInfraResponse.text();
            throw new Error(`DeepInfra API request failed with status ${deepInfraResponse.status}: ${errorText}`);
        }

        response = await deepInfraResponse.json();
    }

    return response;
}

/**
 * Extract the response text from API response
 * @param {Object} response - API response
 * @returns {string} - Response text
 */
function extractResponseText(response) {
    if (response && response.choices && Array.isArray(response.choices) && 
        response.choices[0] && response.choices[0].message && 
        response.choices[0].message.content) {
        return response.choices[0].message.content.trim();
    }
    return '';
}

// Export functions for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getApiProvider,
        getApiKey,
        makeApiRequest,
        extractResponseText
    };
}