document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const actionsView = document.getElementById('actions-view');
    const actionSetupView = document.getElementById('action-setup-view');
    const actionsListContainer = document.getElementById('actions-list');
    const actionEditorForm = document.getElementById('action-editor-form');
    const backButton = document.getElementById('back-to-actions');
    const setupTitle = document.getElementById('setup-title');

    // --- State ---
    let actionButtons = [];
    let isMicroButtonVisible = true;
    let isReadButtonVisible = true;
    let editingActionIndex = -1;
    
    const ICONS = {
        micro: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`,
        read: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></svg>`
    };

    const MODEL_OPTIONS = [
      { value: 'anthropic/claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
      { value: 'anthropic/claude-4-sonnet', label: 'Claude 4 Sonnet' },
      { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
      { value: 'mistralai/Mistral-Small-3.1-24B-Instruct-2503', label: 'Mistral Small 3.1 24B' },
      { value: 'mistralai/Devstral-Small-2505', label: 'Devstral Small 2505' },
      { value: 'mistralai/Mistral-Small-24B-Instruct-2501', label: 'Mistral Small 24B' },
      { value: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', label: 'Llama 4 Maverick 17B' },
      { value: 'deepseek-ai/DeepSeek-R1-0528', label: 'DeepSeek R1 0528' },
      { value: 'deepseek-ai/DeepSeek-R1-Turbo', label: 'DeepSeek R1 Turbo' }
    ];

    const DEFAULT_ACTION_BUTTONS = [
      { id: 'correct-grammar', title: 'Correct', prompt: '...' },
      { id: 'translate', title: 'Translate', prompt: '...' },
      { id: 'professional', title: 'Professionalize', prompt: '...' },
      { id: 'synthesize', title: 'Synthesize', prompt: '...' }
    ];

    // --- Rendering ---
    function renderActionCards() {
        if (!actionsListContainer) return;
        actionsListContainer.innerHTML = '';

        renderSpecialCard('micro', 'Microphone', isMicroButtonVisible);
        renderSpecialCard('read', 'Read', isReadButtonVisible);

        actionButtons.forEach((action, index) => {
            const card = document.createElement('div');
            card.className = 'action-card';
            card.dataset.index = index;
            const identifier = action.title ? action.title.charAt(0).toUpperCase() : '?';
            
            card.innerHTML = `
                <div class="action-identifier">${identifier}</div>
                <span class="action-name">${action.title}</span>`;
            card.addEventListener('click', () => openActionSetup(index));
            actionsListContainer.appendChild(card);
        });

        const newActionCard = document.createElement('div');
        newActionCard.className = 'action-card new-action-card';
        newActionCard.innerHTML = '<span>+ New Action</span>';
        newActionCard.addEventListener('click', () => openActionSetup(-1));
        actionsListContainer.appendChild(newActionCard);
    }

    function renderSpecialCard(id, title, isEnabled) {
        const card = document.createElement('div');
        card.className = `action-card special-card ${isEnabled ? 'active' : 'inactive'}`;
        card.dataset.id = id;

        const statusText = isEnabled ? 'Active' : 'Inactive';
        const icon = ICONS[id] || '';

        card.innerHTML = `
            <div class="action-icon">${icon}</div>
            <div class="action-text-content">
                <span class="action-name">${title}</span>
                <span class="action-status">${statusText}</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            if (id === 'micro') {
                isMicroButtonVisible = !isMicroButtonVisible;
                chrome.storage.sync.set({ isMicroButtonVisible: isMicroButtonVisible }, renderActionCards);
            } else if (id === 'read') {
                isReadButtonVisible = !isReadButtonVisible;
                chrome.storage.sync.set({ isReadButtonVisible: isReadButtonVisible }, renderActionCards);
            }
        });
        
        actionsListContainer.appendChild(card);
    }

    function renderActionSetupForm(action) {
        actionEditorForm.innerHTML = `
            <div class="form-group">
                <label for="action-title">Title</label>
                <input type="text" id="action-title" value="${action.title || ''}" placeholder="e.g., Translate to French">
            </div>
            <div class="form-group">
                <label for="action-prompt">Prompt</label>
                <textarea id="action-prompt" placeholder="e.g., Translate this: {{text}}">${action.prompt || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="action-model">Model</label>
                <select id="action-model">
                    ${MODEL_OPTIONS.map(opt => `<option value="${opt.value}" ${action.model === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                </select>
            </div>
            <button id="save-action-button">Save Action</button>
            ${editingActionIndex !== -1 ? '<button id="delete-action-button">Delete Action</button>' : ''}
        `;
        document.getElementById('save-action-button').addEventListener('click', saveAction);
        if (editingActionIndex !== -1) {
            document.getElementById('delete-action-button').addEventListener('click', deleteAction);
        }
    }

    // --- Actions ---
    function openActionSetup(index) {
        editingActionIndex = index;
        if (index === -1) { // New action
            setupTitle.textContent = 'New Action';
            renderActionSetupForm({ title: '', prompt: '', model: MODEL_OPTIONS[0].value });
        } else { // Editing existing action
            setupTitle.textContent = 'Edit Action';
            renderActionSetupForm(actionButtons[index]);
        }
        showView(actionSetupView);
    }

    function saveAction() {
        const newAction = {
            id: editingActionIndex === -1 ? `custom-${Date.now()}` : actionButtons[editingActionIndex].id,
            title: document.getElementById('action-title').value,
            prompt: document.getElementById('action-prompt').value,
            model: document.getElementById('action-model').value,
        };

        if (editingActionIndex === -1) {
            actionButtons.push(newAction);
        } else {
            actionButtons[editingActionIndex] = newAction;
        }
        
        chrome.storage.sync.set({ actionButtonsSettings: actionButtons }, () => {
            renderActionCards();
            showView(actionsView);
        });
    }

    function deleteAction() {
        if (editingActionIndex !== -1) {
            actionButtons.splice(editingActionIndex, 1);
            chrome.storage.sync.set({ actionButtonsSettings: actionButtons }, () => {
                renderActionCards();
                showView(actionsView);
            });
        }
    }

    // --- View Management ---
    function showView(viewToShow) {
        actionsView.classList.remove('active');
        actionSetupView.classList.remove('active');
        viewToShow.classList.add('active');
    }

    // --- Event Listeners ---
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tab = link.getAttribute('data-tab');
            tabLinks.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(tab).classList.add('active');
        });
    });

    backButton.addEventListener('click', () => showView(actionsView));
    
    // --- API Key Management (in Account tab) ---
    const apiKeyInput = document.getElementById('api-key');
    if (apiKeyInput) {
        chrome.storage.sync.get(['deepinfraApiKey'], function(result) {
            if (result.deepinfraApiKey) apiKeyInput.value = result.deepinfraApiKey;
        });

        apiKeyInput.addEventListener('input', debounce(async function() {
            const key = apiKeyInput.value.trim();
            apiKeyInput.style.transition = 'border-color 0.3s';
            apiKeyInput.style.borderColor = '#fdba74'; // Indicate checking

            if (!key) {
                apiKeyInput.style.borderColor = '#e5e7eb'; // Reset to default
                chrome.storage.sync.remove('deepinfraApiKey');
                return;
            }

            try {
                const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'google/gemini-2.0-flash-001', messages: [{ role: 'user', content: 'ping' }] })
                });
                if (!response.ok) throw new Error('Invalid');
                const data = await response.json();
                if (data.error || !data.choices) throw new Error('Invalid');

                chrome.storage.sync.set({ deepinfraApiKey: key });
                apiKeyInput.style.borderColor = '#4ade80'; // Valid key
            } catch (err) {
                chrome.storage.sync.remove('deepinfraApiKey');
                apiKeyInput.style.borderColor = '#f87171'; // Invalid key
            }
        }, 500));

        apiKeyInput.addEventListener('blur', () => {
            apiKeyInput.style.borderColor = '#e5e7eb'; // Reset on blur
        });
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // --- Initialization ---
    function initialize() {
        chrome.storage.sync.get(['actionButtonsSettings', 'isMicroButtonVisible', 'isReadButtonVisible', 'deepinfraApiKey'], (result) => {
            actionButtons = result.actionButtonsSettings || DEFAULT_ACTION_BUTTONS.slice();
            isMicroButtonVisible = result.isMicroButtonVisible !== false;
            isReadButtonVisible = result.isReadButtonVisible !== false;

            if (result.deepinfraApiKey && apiKeyInput) {
                apiKeyInput.value = result.deepinfraApiKey;
            }

            renderActionCards();
            showView(actionsView);
        });
    }

    initialize();
});