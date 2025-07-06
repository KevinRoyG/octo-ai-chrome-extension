// Options page functionality
document.addEventListener('DOMContentLoaded', function() {
    const apiProviderSelect = document.getElementById('apiProvider');
    const elevenlabsSection = document.getElementById('elevenlabsSection');
    const deepinfraSection = document.getElementById('deepinfraSection');
    const elevenlabsApiKeyInput = document.getElementById('elevenlabsApiKey');
    const deepinfraApiKeyInput = document.getElementById('deepinfraApiKey');
    const toggleElevenlabsApiKeyBtn = document.getElementById('toggleElevenlabsApiKey');
    const toggleDeepinfraApiKeyBtn = document.getElementById('toggleDeepinfraApiKey');
    const speedSlider = document.getElementById('speed');
    const speedValue = document.getElementById('speedValue');
    const saveBtn = document.getElementById('saveBtn');
    const resetStatsBtn = document.getElementById('resetStats');
    const statusDiv = document.getElementById('status');
    
    // Load saved settings
    loadSettings();
    
    // Toggle API provider sections
    apiProviderSelect.addEventListener('change', function() {
        if (this.value === 'elevenlabs') {
            elevenlabsSection.style.display = 'block';
            deepinfraSection.style.display = 'none';
        } else {
            elevenlabsSection.style.display = 'none';
            deepinfraSection.style.display = 'block';
        }
    });
    
    // Toggle API key visibility
    toggleElevenlabsApiKeyBtn.addEventListener('click', function() {
        elevenlabsApiKeyInput.type = elevenlabsApiKeyInput.type === 'password' ? 'text' : 'password';
        this.textContent = elevenlabsApiKeyInput.type === 'password' ? 'Show' : 'Hide';
    });

    toggleDeepinfraApiKeyBtn.addEventListener('click', function() {
        deepinfraApiKeyInput.type = deepinfraApiKeyInput.type === 'password' ? 'text' : 'password';
        this.textContent = deepinfraApiKeyInput.type === 'password' ? 'Show' : 'Hide';
    });
    
    // Update speed value display
    speedSlider.addEventListener('input', function() {
        speedValue.textContent = this.value + 'x';
    });
    
    // Save settings
    saveBtn.addEventListener('click', function() {
        saveSettings();
    });
    
    // Reset statistics
    resetStatsBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset all usage statistics?')) {
            chrome.storage.sync.set({
                charactersUsed: 0,
                estimatedCost: 0
            }, function() {
                loadUsageStats();
                showStatus('Statistics reset successfully!', 'success');
            });
        }
    });
    
    // Load settings from storage
    function loadSettings() {
        chrome.storage.sync.get([
            'apiProvider',
            'elevenlabsApiKey',
            'deepinfraApiKey',
            'playbackSpeed',
            'charactersUsed',
            'estimatedCost'
        ], function(result) {
            // Set API provider
            if (result.apiProvider) {
                apiProviderSelect.value = result.apiProvider;
                if (result.apiProvider === 'elevenlabs') {
                    elevenlabsSection.style.display = 'block';
                    deepinfraSection.style.display = 'none';
                } else {
                    elevenlabsSection.style.display = 'none';
                    deepinfraSection.style.display = 'block';
                }
            }
            
            // Set API keys
            if (result.elevenlabsApiKey) {
                elevenlabsApiKeyInput.value = result.elevenlabsApiKey;
            }
            if (result.deepinfraApiKey) {
                deepinfraApiKeyInput.value = result.deepinfraApiKey;
            }
            
            // Set playback speed
            if (result.playbackSpeed) {
                speedSlider.value = result.playbackSpeed;
                speedValue.textContent = result.playbackSpeed + 'x';
            }
            
            loadUsageStats();
        });
    }
    
    // Load usage statistics
    function loadUsageStats() {
        chrome.storage.sync.get(['charactersUsed', 'estimatedCost'], function(result) {
            document.getElementById('charactersUsed').textContent = (result.charactersUsed || 0).toLocaleString();
            document.getElementById('estimatedCost').textContent = '$' + (result.estimatedCost || 0).toFixed(2);
        });
    }
    
    // Save settings to storage
    function saveSettings() {
        const apiProvider = apiProviderSelect.value;
        const settings = {
            apiProvider: apiProvider,
            elevenlabsApiKey: elevenlabsApiKeyInput.value.trim(),
            deepinfraApiKey: deepinfraApiKeyInput.value.trim(),
            playbackSpeed: speedSlider.value
        };
        
        // Validate API key based on selected provider
        if (apiProvider === 'elevenlabs' && !settings.elevenlabsApiKey) {
            showStatus('Please enter your ElevenLabs API key', 'error');
            return;
        }
        if (apiProvider === 'deepinfra' && !settings.deepinfraApiKey) {
            showStatus('Please enter your DeepInfra API key', 'error');
            return;
        }
        
        chrome.storage.sync.set(settings, function() {
            showStatus('Settings saved successfully!', 'success');
        });
    }
    
    // Show status message
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status-message ' + type;
        
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status-message';
        }, 3000);
    }
});