// Content script for text selection detection
let selectedText = '';
let selectionTimeout;

// Track the current audio object and its URL globally
let currentAudio = null;
let currentAudioUrl = null;
let isPaused = false;
let currentPlaybackRate = 1.0;
let highlightInterval = null;
let lastTextWords = [];
let lastTimestamps = null;
let uiState = 'idle'; // 'idle' | 'loading' | 'ready' | 'playing' | 'paused'
let lastGeneratedText = '';
let lastGeneratedAudioUrl = null;
let lastGeneratedTimestamps = null;
let lastGeneratedWords = [];
let lastSelectedText = '';
let lastSelectedStartWordIdx = 0;

// --- Contextual Toolbar Implementation ---

let toolbar = null;
let toolbarState = 'idle'; // 'idle' | 'show-play' | 'loading' | 'playing' | 'paused'

let lastPausedWordIdx = 0;
let lastPausedTime = 0;

let speedDropdown = null;

let highlightSpans = [];

// Store audio and alignment for reuse
let audioCache = {};

// Reading overlay elements
let readingOverlay = null;
let currentWordElement = null;

let currentTimestamps = null;
let currentSentenceBox = null;

let currentAlignment = null;
let currentNormalizedAlignment = null;

let autoscrollActive = true;
let userScrollTimeout = null;
let relaunchBtn = null;

let lastScrollLine = 0;
let lastValidWordIdx = 0;

let dragContainer = null;
let dragHandle = null;

let toolbarContainer = null;

let userHasDragged = false;

// --- TTS Sidebar ---
let ttsSidebar = null;
let ttsContentArea = null;
let ttsControlsArea = null;
let ttsSidebarCloser = null;
let ttsWordSpans = [];
let lastHighlightedWordIndex = -1;
let selectedHtmlFragment = null;

let isTeleprompterEnabled = true;

// --- Action menu for text selection ---
let actionMenu = null;

// --- ENREGISTREMENT AUDIO ALT+< ---
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let altBackquoteIsDown = false;

// --- Visualizer style shadcn glassmorphism défilant ---
let visualizerBox = null;
let visualizerCanvas = null;
let visualizerCtx = null;
let animationFrameId = null;
let audioContext = null;
let analyser = null;
let dataArray = null;
let source = null;
let isVisualizerLoading = false;
let scrollBuffer = [];
const BAR_COUNT = 150; // Réduit à 150 barres au lieu de 240

// Variables pour le smoothing audio
let lastAudioLevel = 0;
let targetAudioLevel = 0;
let smoothingFactor = 0.15; // Facteur de lissage (0-1) - plus petit = plus lisse
let attackRate = 0.5; // Vitesse d'augmentation (0-1) - plus grand = plus rapide
let releaseRate = 0.08; // Vitesse de diminution (0-1) - plus petit = plus lent

// --- Empêcher la saisie pendant l'enregistrement et coller le texte à la réception ---

let suppressInput = false;
let lastActiveElement = null;

// --- Microphone button in editable fields ---
let microButton = null;
let activeEditableElement = null;
let isMicroButtonRecording = false;
let lastClickPosition = null; // Stocker la dernière position de clic

let lastSelectionRange = null;
let lastActiveEditableElement = null;
let lastInputSelection = null;
let correctionLoader = null;
let correctionLabelTimeout = null;

let micInactivityTimeout = null;

let isMicroButtonEnabled = true;

// Drag and drop for micro button
let isDraggingMicroButton = false;
let microButtonWasDragged = false;
let microButtonOffsetX = 0;
let microButtonOffsetY = 0;

let lastActiveEditableElementForInsertion = null;

// Initialiser la visibilité du bouton Read au chargement
let isReadButtonVisible = true;

let octoButton = null;
let octoActionBubblesContainer = null;
let octoContainer = null;
let isOctoMenuOpen = false;
let isDraggingOctoButton = false;
let octoButtonWasDragged = false;
let octoButtonOffsetX = 0;
let octoButtonOffsetY = 0;

let octoMenuHideTimeout = null;

function showOctoMenu() {
    if (octoMenuHideTimeout) {
        clearTimeout(octoMenuHideTimeout);
        octoMenuHideTimeout = null;
    }

    if (isOctoMenuOpen) return;

    isOctoMenuOpen = true;

    if (octoButton) {
        octoButton.classList.add('bump');
        setTimeout(() => {
            if (octoButton) octoButton.classList.remove('bump');
        }, 300);
    }

    if (octoContainer) octoContainer.classList.add('gooey-effect');
    showActionBubbles();
}

function hideOctoMenu() {
    if (!isOctoMenuOpen) return;
    
    isOctoMenuOpen = false;
    if (octoContainer) octoContainer.classList.remove('gooey-effect');
    hideActionBubbles();
}

function scheduleHideOctoMenu() {
    if (octoMenuHideTimeout) {
        clearTimeout(octoMenuHideTimeout);
    }
    octoMenuHideTimeout = setTimeout(hideOctoMenu, 2000);
}

const ACTION_ICONS = {
    micro: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
    read: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`
};

function initializeMicroButtonState() {
  chrome.storage.sync.get(['isMicroButtonVisible'], (result) => {
    const isMicroButtonEnabled = result.isMicroButtonVisible !== false;
    if (isMicroButtonEnabled) {
      showOctoButton();
    } else {
      hideOctoButton();
    }
  });
}

function createToolbar() {
  if (toolbar) return;
  toolbar = document.createElement('div');
  toolbar.id = 'elevenlabs-toolbar';
  toolbar.style.cssText = `
    position: absolute;
    z-index: 100000;
    display: flex;
    gap: 8px;
    background: rgba(255,255,255,0.98);
    border-radius: 9999px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.10);
    border: 1px solid #e5e7eb;
    padding: 6px 10px;
    align-items: center;
    transition: box-shadow 0.2s;
  `;
  document.body.appendChild(toolbar);
}

function removeToolbar() {
  if (toolbar) {
    toolbar.remove();
    toolbar = null;
  }
}

function renderToolbarUI() {
  if (!toolbarContainer) return;
  toolbarContainer.innerHTML = '';

  // Pill background wrapper
  const pill = document.createElement('div');
  pill.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(8px);
    border-radius: 9999px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.10);
    padding: 6px 16px 6px 10px;
    min-height: 44px;
    min-width: 180px;
    max-width: 100%;
  `;

  // Create controls wrapper
  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.alignItems = 'center';
  controls.style.gap = '8px';

  // Play/Pause/Loading button
  const playPauseBtn = document.createElement('button');
  playPauseBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;border:1px solid #111;background:#111;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.06);margin:0 2px;cursor:pointer;transition:background 0.2s;position:relative;';
  playPauseBtn.title = toolbarState === 'playing' ? 'Pause' : 'Play';

  if (toolbarState === 'loading') {
    // Spinner animation
    playPauseBtn.innerHTML = `<span style="display:inline-block;width:22px;height:22px;border:3px solid #fff;border-top:3px solid #888;border-radius:50%;animation:spinBtn 1s linear infinite;"></span>`;
    playPauseBtn.disabled = true;
  } else if (toolbarState === 'playing') {
    playPauseBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    playPauseBtn.onclick = () => { if (currentAudio) currentAudio.pause(); };
  } else {
    playPauseBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    playPauseBtn.onclick = () => {
      if (currentAudio) {
        if (currentAudio.ended) {
          currentAudio.currentTime = 0;
        }
        currentAudio.play().catch(e => console.error("Audio playback failed:", e));
      } else if (selectedText) {
        toolbarState = 'loading';
        renderToolbarUI();
        chrome.runtime.sendMessage({ action: 'convertToSpeech', text: selectedText });
      }
    };
  }
  controls.appendChild(playPauseBtn);

  // Add spinner keyframes if not present
  if (!document.getElementById('el-toolbar-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'el-toolbar-spinner-style';
    style.innerHTML = `@keyframes spinBtn{to{transform:rotate(360deg)}}`;
    document.head.appendChild(style);
  }

  // Repeat button
  const repeatBtn = document.createElement('button');
  repeatBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;border:1px solid #e5e7eb;background:#fff;color:#222;box-shadow:0 1px 4px rgba(0,0,0,0.06);margin:0 2px;cursor:pointer;transition:background 0.2s;';
  repeatBtn.title = 'Restart';
  repeatBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>';
  repeatBtn.onclick = () => {
    if (currentAudio) {
      currentAudio.currentTime = 0;
      currentAudio.play();
    } else if (selectedText) {
      chrome.runtime.sendMessage({ action: 'convertToSpeech', text: selectedText });
    }
  };
  controls.appendChild(repeatBtn);

  // Speed controls
  const speedMinus = document.createElement('button');
  speedMinus.textContent = '–';
  speedMinus.style.cssText = 'background:none;border:none;color:#888;font-size:1.2em;cursor:pointer;padding:0 4px;';
  speedMinus.onclick = () => {
    if (currentPlaybackRate > 0.76) {
      currentPlaybackRate = Math.max(0.75, +(currentPlaybackRate - 0.25).toFixed(2));
      if (currentAudio) currentAudio.playbackRate = currentPlaybackRate;
      renderToolbarUI();
    }
  };
  const speedPlus = document.createElement('button');
  speedPlus.textContent = '+';
  speedPlus.style.cssText = 'background:none;border:none;color:#888;font-size:1.2em;cursor:pointer;padding:0 4px;';
  speedPlus.onclick = () => {
    if (currentPlaybackRate < 1.99) {
      currentPlaybackRate = Math.min(2.0, +(currentPlaybackRate + 0.25).toFixed(2));
      if (currentAudio) currentAudio.playbackRate = currentPlaybackRate;
      renderToolbarUI();
    }
  };
  const speedValue = document.createElement('span');
  speedValue.textContent = currentPlaybackRate.toFixed(2).replace(/\.00$/, '') + 'x';
  speedValue.style.cssText = 'min-width:36px;text-align:center;color:#888;';
  const speedControl = document.createElement('span');
  speedControl.style.cssText = 'display:inline-flex;align-items:center;gap:2px;margin-left:8px;font-size:0.95em;color:#888;';
  speedControl.appendChild(speedMinus);
  speedControl.appendChild(speedValue);
  speedControl.appendChild(speedPlus);
  controls.appendChild(speedControl);

  pill.appendChild(controls);
  // Drag handle at the right
  dragHandle.style.position = 'static';
  dragHandle.style.marginLeft = 'auto';
  dragHandle.style.marginRight = '0';
  pill.appendChild(dragHandle);

  toolbarContainer.appendChild(pill);
}

function positionToolbar(selection) {
  if (!toolbar) return;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  toolbar.style.left = `${window.scrollX + rect.left + rect.width/2 - toolbar.offsetWidth/2}px`;
  toolbar.style.top = `${window.scrollY + rect.top - toolbar.offsetHeight - 8}px`;
}

function shouldShowContentWindow() {
  return (selectedText && selectedText.length > 0) || (currentAudio && !currentAudio.paused);
}

function updateContentWindowVisibility() {
  if (dragContainer) {
    dragContainer.style.display = shouldShowContentWindow() ? 'flex' : 'none';
  }
}

// --- Selection logic ---
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text.length > 0) {
    selectedText = text;
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        selectedHtmlFragment = range.cloneContents();
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    currentAudioUrl = null;
    if (dragContainer) {
      dragContainer.style.display = 'none';
    }
    lastValidWordIdx = 0;
  } else {
    selectedText = '';
    selectedHtmlFragment = null;
    updateContentWindowVisibility();
  }
});

function getCurrentWordIdxFromTime(currentTime, alignment) {
  if (!alignment || !alignment.words) return 0;
  
  // Find the word that contains the current time
  const wordIdx = alignment.words.findIndex(word => {
    // Add a small buffer to account for timing differences
    const buffer = 0.05;
    return currentTime >= (word.start - buffer) && currentTime <= (word.end + buffer);
  });
  
  console.log('Current time:', currentTime, 'Word index:', wordIdx, 'Words:', alignment.words);
  return wordIdx >= 0 ? wordIdx : 0;
}

function handleToolbarEvents() {
  if (!toolbar) return;
  
  // Vérifier si le contexte de l'extension est valide
  function isExtensionContextValid() {
    try {
      return chrome.runtime && chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  toolbar.onclick = (e) => {
    if (!isExtensionContextValid()) {
      console.error('Extension context invalidated');
      toolbarState = 'idle';
      renderToolbarUI();
      return;
    }

    if (e.target.closest('#el-toolbar-speed-minus')) {
      if (currentPlaybackRate > 0.76) {
        currentPlaybackRate = Math.max(0.75, +(currentPlaybackRate - 0.25).toFixed(2));
        if (currentAudio) currentAudio.playbackRate = currentPlaybackRate;
        renderToolbarUI();
      }
      return;
    }
    if (e.target.closest('#el-toolbar-speed-plus')) {
      if (currentPlaybackRate < 1.99) {
        currentPlaybackRate = Math.min(2.0, +(currentPlaybackRate + 0.25).toFixed(2));
        if (currentAudio) currentAudio.playbackRate = currentPlaybackRate;
        renderToolbarUI();
      }
      return;
    }
    if (e.target.closest('#el-toolbar-play')) {
      // Resume if paused
      if (toolbarState === 'paused' && currentAudio) {
        currentAudio.play().catch(error => {
          console.error('Error playing audio:', error);
          toolbarState = 'idle';
          renderToolbarUI();
        });
        toolbarState = 'playing';
        renderToolbarUI();
        createReadingOverlay();
        // Highlight the current word immediately
        if (lastGeneratedTimestamps && lastGeneratedTimestamps.words) {
          const currentWordIdx = getCurrentWordIdxFromTime(currentAudio.currentTime, lastGeneratedTimestamps);
          highlightCurrentWord(currentWordIdx);
        }
        return;
      }
      const words = selectedText.split(/\s+/);
      const cacheKey = selectedText;
      if (
        (words.length < 3 || (lastGeneratedText && lastGeneratedText.includes(selectedText))) &&
        audioCache[cacheKey]
      ) {
        // Play from memory
        if (currentAudio) {
          currentAudio.pause();
        }
        currentAudio = audioCache[cacheKey].audio;
        currentAudio.playbackRate = currentPlaybackRate;
        // Resume from last paused word if available
        if (toolbarState === 'paused' && audioCache[cacheKey].alignment && audioCache[cacheKey].lastPausedWordIdx > 0) {
          const startTime = audioCache[cacheKey].alignment.words[audioCache[cacheKey].lastPausedWordIdx].start;
          currentAudio.currentTime = startTime;
        }
        currentAudio.onplay = () => {
          toolbarState = 'playing';
          renderToolbarUI();
          createReadingOverlay();
          highlightSelectedWordsInDOM(selectedText);
        };
        currentAudio.ontimeupdate = () => {
          if (audioCache[cacheKey].alignment && audioCache[cacheKey].alignment.words) {
            audioCache[cacheKey].lastPausedWordIdx = getCurrentWordIdxFromTime(currentAudio.currentTime, audioCache[cacheKey].alignment);
            updateDOMHighlight(audioCache[cacheKey].lastPausedWordIdx);
            highlightCurrentWord(audioCache[cacheKey].lastPausedWordIdx);
          }
        };
        currentAudio.onpause = () => {
          toolbarState = 'paused';
          renderToolbarUI();
        };
        currentAudio.onended = () => {
          clearInterval(highlightInterval);
          toolbarState = 'paused';
          renderToolbarUI();
          removeReadingOverlay();
          removeWordHighlights();
        };
        currentAudio.play().catch(error => {
          console.error('Error playing audio:', error);
          toolbarState = 'idle';
          renderToolbarUI();
        });
        isPaused = false;
      } else {
        toolbarState = 'loading';
        renderToolbarUI();
        try {
          chrome.runtime.sendMessage({
            action: 'convertToSpeech',
            text: selectedText
          }).catch(error => {
            console.error('Error sending message to background:', error);
            toolbarState = 'idle';
            renderToolbarUI();
          });
        } catch (error) {
          console.error('Error sending message to background:', error);
          toolbarState = 'idle';
          renderToolbarUI();
        }
      }
    } else if (e.target.closest('#el-toolbar-pause')) {
      if (currentAudio) {
        currentAudio.pause();
        // Store paused word idx in cache
        const cacheKey = selectedText;
        if (audioCache[cacheKey] && audioCache[cacheKey].alignment && audioCache[cacheKey].alignment.words) {
          audioCache[cacheKey].lastPausedWordIdx = getCurrentWordIdxFromTime(currentAudio.currentTime, audioCache[cacheKey].alignment);
        }
        toolbarState = 'paused';
        renderToolbarUI();
      }
    } else if (e.target.closest('#el-toolbar-replay')) {
      const cacheKey = selectedText;
      if (audioCache[cacheKey]) {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        currentAudio = audioCache[cacheKey].audio;
        currentAudio.playbackRate = currentPlaybackRate;
        audioCache[cacheKey].lastPausedWordIdx = 0;
        currentAudio.onplay = () => {
          toolbarState = 'playing';
          renderToolbarUI();
          createReadingOverlay();
          highlightSelectedWordsInDOM(selectedText);
        };
        currentAudio.ontimeupdate = () => {
          if (audioCache[cacheKey].alignment && audioCache[cacheKey].alignment.words) {
            audioCache[cacheKey].lastPausedWordIdx = getCurrentWordIdxFromTime(currentAudio.currentTime, audioCache[cacheKey].alignment);
            updateDOMHighlight(audioCache[cacheKey].lastPausedWordIdx);
            highlightCurrentWord(audioCache[cacheKey].lastPausedWordIdx);
          }
        };
        currentAudio.onpause = () => {
          toolbarState = 'paused';
          renderToolbarUI();
        };
        currentAudio.onended = () => {
          clearInterval(highlightInterval);
          toolbarState = 'paused';
          renderToolbarUI();
          removeReadingOverlay();
          removeWordHighlights();
        };
        currentAudio.play().catch(error => {
          console.error('Error playing audio:', error);
          toolbarState = 'idle';
          renderToolbarUI();
        });
        isPaused = false;
      }
    }
  };
}

// --- Audio response handler ---
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request.action);

    // Vérifier si le contexte de l'extension est valide
    function isExtensionContextValid() {
      try {
        return chrome.runtime && chrome.runtime.id;
      } catch (e) {
        return false;
      }
    }

    if (!isExtensionContextValid()) {
      console.error('Extension context invalidated');
      toolbarState = 'idle';
      if(renderToolbarUI) {
        renderToolbarUI();
      }
      return;
    }

    switch (request.action) {
      case 'playAudio':
        {
          const uint8Arr = new Uint8Array(request.audioBuffer);
          const audioBlob = new Blob([uint8Arr], {
            type: 'audio/mpeg'
          });
          const audioUrl = URL.createObjectURL(audioBlob);
          currentAudioUrl = audioUrl;
          lastGeneratedAudioUrl = audioUrl;
          lastGeneratedText = selectedText;
          lastGeneratedTimestamps = request.alignment || null;
          lastGeneratedWords = selectedText.split(/\s+/);
          const audio = new Audio(audioUrl);
          currentAudio = audio;
          audio.playbackRate = currentPlaybackRate;
          lastPausedWordIdx = 0;
          // Store in cache
          audioCache[selectedText] = {
            audio,
            alignment: lastGeneratedTimestamps,
            lastPausedWordIdx: 0
          };
          audio.ontimeupdate = () => {
            if (lastGeneratedTimestamps && lastGeneratedTimestamps.words) {
              const currentWordIdx = getCurrentWordIdxFromTime(audio.currentTime, lastGeneratedTimestamps);
              highlightCurrentWord(currentWordIdx);
            }
          };
          audio.onplay = () => {
            toolbarState = 'playing';
            renderToolbarUI();
            createReadingOverlay();
            updateContentWindowVisibility();
            // Highlight the first word immediately
            if (lastGeneratedTimestamps && lastGeneratedTimestamps.words) {
              highlightCurrentWord(0);
            }
          };
          audio.onpause = () => {
            toolbarState = 'paused';
            renderToolbarUI();
            updateContentWindowVisibility();
          };
          audio.onended = () => {
            clearInterval(highlightInterval);
            toolbarState = 'paused';
            renderToolbarUI();
            removeReadingOverlay();
            updateContentWindowVisibility();
          };
          audio.play();
          isPaused = false;
        }
        break;

      case 'showError':
        console.error('Error message received:', request.message);
        // Only show error if we don't have audio data
        if (!currentAudio) {
          // Optionally show error in toolbar
          if (toolbar) {
            toolbar.innerHTML = `<span style='color:#dc3545;font-size:0.95em;'>${request.message}</span>`;
          }
          toolbarState = 'idle';
          renderToolbarUI();
        }
        break;

      case 'playAudioWithTimestamps':
        console.log('Processing audio with timestamps...');
        try {
          let base64Data = request.audioBuffer;
          if (base64Data.startsWith('data:')) {
            base64Data = base64Data.split(',')[1];
          }
    
          const audioData = atob(base64Data);
          const audioArrayBuffer = new ArrayBuffer(audioData.length);
          const audioUint8Array = new Uint8Array(audioArrayBuffer);
          for (let i = 0; i < audioData.length; i++) {
            audioUint8Array[i] = audioData.charCodeAt(i);
          }
    
          const audioBlob = new Blob([audioUint8Array], { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);
          currentAudioUrl = audioUrl;
          lastGeneratedAudioUrl = audioUrl;
          lastGeneratedText = selectedText;
    
          let alignment;
          if (!request.alignment || !Array.isArray(request.alignment) || request.alignment.length === 0) {
            const words = selectedText.split(/\s+/);
            const estimatedDuration = words.length * 0.3; 
            alignment = {
              words: words.map((word, index) => ({ text: word, start: index * 0.3, end: (index + 1) * 0.3 }))
            };
          } else {
            alignment = { words: request.alignment };
          }
          currentAlignment = alignment;
    
          audioCache[selectedText] = { audio: null, alignment: alignment, lastPausedWordIdx: 0 };
    
          showTtsSidebar();
    
          const audio = new Audio(audioUrl);
          currentAudio = audio;
          audioCache[selectedText].audio = audio;
          audio.playbackRate = currentPlaybackRate;
    
          audio.onloadedmetadata = () => {
            if (!request.alignment || !Array.isArray(request.alignment) || request.alignment.length === 0) {
              const words = selectedText.split(/\s+/);
              const wordDuration = audio.duration / words.length;
              alignment.words = words.map((word, index) => ({ text: word, start: index * wordDuration, end: (index + 1) * wordDuration }));
              currentAlignment = alignment;
              audioCache[selectedText].alignment = alignment;
            }
          };
    
          audio.onplay = () => {
            toolbarState = 'playing';
            renderTtsControls();
            if (alignment.words && alignment.words.length > 0) {
              updateTtsContent(selectedText);
            }
          };
    
          audio.ontimeupdate = () => {
            if (alignment.words && alignment.words.length > 0) {
              updateTtsContent(selectedText, audio.currentTime);
            }
          };
    
          audio.onended = () => {
            toolbarState = 'paused';
            renderTtsControls();
          };
    
          audio.onpause = () => {
            toolbarState = 'paused';
            renderTtsControls();
          };
    
          audio.onerror = (error) => {
            console.error('Audio playback error:', error);
            toolbarState = 'idle';
            renderTtsControls();
          };
    
          audio.play().catch(e => {
              console.error("Audio playback failed on start:", e);
              toolbarState = 'paused';
              renderTtsControls();
          });

        } catch (error) {
          console.error('Error processing audio data:', error);
          toolbarState = 'idle';
          renderTtsControls();
        }
        break;

      case 'setMicroButtonVisibility':
        const isEnabled = request.visible;
        if (isEnabled) {
            showOctoButton();
        } else {
            hideOctoButton();
        }
        break;

      case 'setReadButtonVisibility':
        isReadButtonVisible = request.visible;
        break;

      case 'grammarCorrected':
        hideCorrectionLoader();
        if (request.correctedText) {
          if (request.sidechat) {
            // It's a sidechat action. Check if it's a new chat or a follow-up.
            if (octoSideChatActive && request.chatId === octoChatId) {
              // This is a follow-up message in an existing, active chat.
              showSideChat({
                answer: request.correctedText,
                isNew: false
              });
            } else {
              // This is the first message that opens a new chat.
              showSideChat({
                prompt: request.prompt || '',
                context: selectedText || '',
                model: request.model || '',
                answer: request.correctedText,
                isNew: true
              });
            }
          } else {
            insertTextInPage(request.correctedText, true);
          }
        } else {
          // Handle error case where there is no corrected text
          if (!request.sidechat) {
            hideCorrectionLabel(); // Or show an error label
          }
        }
        removeSelectionHighlight();
        removeInputHighlight();
        break;

      case 'selectAllHeadingsAndParagraphs':
        selectAllHeadingsAndParagraphs();
        break;
        
      case 'selectCurrentText':
        selectCurrentText();
        break;
        
      case 'playSelectedText':
        playSelectedText();
        break;
    }
  });
}

// --- Minimal spinner animation ---
const style = document.createElement('style');
style.innerHTML = `@keyframes spin{to{transform:rotate(360deg)}}`;
document.head.appendChild(style);

console.log('ElevenLabs Text Reader content script loaded');

function startHighlighting(text, duration, startTime, playbackRate, timestamps = null) {
  clearInterval(highlightInterval);
  lastTextWords = text.split(/\s+/);
  const wordCount = lastTextWords.length;
  if (wordCount < 2) return;
  if (timestamps && Array.isArray(timestamps) && timestamps.length === wordCount) {
    // Utilise les timestamps précis
    highlightInterval = setInterval(() => {
      if (!currentAudio || currentAudio.paused) return;
      const t = currentAudio.currentTime;
      let idx = 0;
      for (let i = 0; i < timestamps.length; i++) {
        if (t >= timestamps[i].start && t < timestamps[i].end) {
          idx = i;
          break;
        }
        if (t >= timestamps[i].end) {
          idx = i;
        }
      }
      updateFloatingPanelText(selectedText, idx);
    }, 40);
  } else {
    // Fallback : estimation par durée
    const wordDuration = duration / wordCount;
    highlightInterval = setInterval(() => {
      if (!currentAudio || currentAudio.paused) return;
      const t = currentAudio.currentTime;
      let idx = Math.floor(t / wordDuration);
      if (idx >= wordCount) idx = wordCount - 1;
      updateFloatingPanelText(selectedText, idx);
    }, 40);
  }
}

function handlePanelEvents() {
  const panel = document.getElementById('elevenlabs-floating-panel');
  if (!panel) return;
  const controlsDiv = panel.querySelector('#el-panel-controls');
  if (!controlsDiv) return;

  controlsDiv.onclick = (e) => {
    if (e.target.id === 'el-panel-play') {
      // If text is <3 words or substring of last generated, play from memory
      const words = selectedText.split(/\s+/);
      if (
        (words.length < 3 || (lastGeneratedText && lastGeneratedText.includes(selectedText))) &&
        lastGeneratedAudioUrl
      ) {
        // Play from memory
        if (currentAudio) {
          currentAudio.pause();
        }
        currentAudio = new Audio(lastGeneratedAudioUrl);
        currentAudio.playbackRate = currentPlaybackRate;
        currentAudio.onplay = () => {
          updateFloatingPanelText(selectedText);
          uiState = 'playing';
          renderPanelUI();
        };
        currentAudio.onpause = () => {
          uiState = 'paused';
          renderPanelUI();
        };
        currentAudio.onended = () => {
          clearInterval(highlightInterval);
          updateFloatingPanelText(selectedText);
          uiState = 'paused';
          renderPanelUI();
        };
        currentAudio.play();
        isPaused = false;
      } else {
        // Need to generate audio
        uiState = 'loading';
        renderPanelUI();
        chrome.runtime.sendMessage({
          action: 'convertToSpeech',
          text: selectedText
        });
      }
    } else if (e.target.id === 'el-panel-pause') {
      if (currentAudio) {
        currentAudio.pause();
        uiState = 'paused';
        renderPanelUI();
      }
    } else if (e.target.id === 'el-panel-replay') {
      if (lastGeneratedAudioUrl) {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        currentAudio = new Audio(lastGeneratedAudioUrl);
        currentAudio.playbackRate = currentPlaybackRate;
        currentAudio.onplay = () => {
          updateFloatingPanelText(selectedText);
          uiState = 'playing';
          renderPanelUI();
        };
        currentAudio.onpause = () => {
          uiState = 'paused';
          renderPanelUI();
        };
        currentAudio.onended = () => {
          clearInterval(highlightInterval);
          updateFloatingPanelText(selectedText);
          uiState = 'paused';
          renderPanelUI();
        };
        currentAudio.play();
        isPaused = false;
      }
    }
  };
}

function highlightSelectedWordsInDOM(selectedText) {
  removeWordHighlights();
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const words = selectedText.match(/\S+/g) || [];
  let startOffset = 0;
  let node = range.startContainer;
  let offset = range.startOffset;
  let wordIdx = 0;
  let currentNode = node;
  let currentOffset = offset;
  let remaining = range.endOffset - range.startOffset;
  // Only handle single text node selection for now (multi-node is more complex)
  if (node.nodeType === Node.TEXT_NODE && node === range.endContainer) {
    let text = node.textContent.slice(range.startOffset, range.endOffset);
    let parent = node.parentNode;
    let idx = 0;
    for (let word of words) {
      let wordPos = text.indexOf(word, idx);
      if (wordPos === -1) break;
      // Split before word
      if (wordPos > idx) {
        const before = document.createTextNode(text.slice(idx, wordPos));
        parent.insertBefore(before, node);
      }
      // Word span
      const span = document.createElement('span');
      span.textContent = word;
      span.className = 'elevenlabs-highlight-word';
      parent.insertBefore(span, node);
      highlightSpans.push(span);
      idx = wordPos + word.length;
    }
    // Remainder
    if (idx < text.length) {
      const after = document.createTextNode(text.slice(idx));
      parent.insertBefore(after, node);
    }
    parent.removeChild(node);
  }
}

function removeWordHighlights() {
  for (const span of highlightSpans) {
    if (span.parentNode) {
      span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
    }
  }
  highlightSpans = [];
}

function updateDOMHighlight(currentWordIdx) {
  highlightSpans.forEach((span, idx) => {
    if (idx === currentWordIdx) {
      span.classList.add('elevenlabs-highlighted-word');
    } else {
      span.classList.remove('elevenlabs-highlighted-word');
    }
  });
}

// Add CSS for inverse highlight
(function() {
  const style = document.createElement('style');
  style.innerHTML = `.elevenlabs-highlighted-word { background: #111 !important; color: #fff !important; border-radius: 4px; padding: 0 2px; transition: background 0.1s, color 0.1s; }`;
  document.head.appendChild(style);
})();

function createReadingOverlay() {
  if (!readingOverlay) {
    readingOverlay = document.createElement('div');
    readingOverlay.className = 'elevenlabs-reading-overlay';
    document.body.appendChild(readingOverlay);
  }
}

function removeReadingOverlay() {
  if (readingOverlay) {
    readingOverlay.remove();
    readingOverlay = null;
  }
}

function highlightCurrentWord(wordIndex) {
  if (!selectedText || !lastGeneratedTimestamps || !lastGeneratedTimestamps.words) return;
  
  const words = selectedText.split(/\s+/);
  if (wordIndex >= words.length) return;
  
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const text = range.toString();
  const word = words[wordIndex];
  
  // Find the word in the selection
  const wordStart = text.indexOf(word);
  if (wordStart === -1) return;
  
  try {
    // Create a new range for the current word
    const wordRange = document.createRange();
    wordRange.setStart(range.startContainer, range.startOffset + wordStart);
    wordRange.setEnd(range.startContainer, range.startOffset + wordStart + word.length);
    
    // Get the element containing the word
    const wordElement = wordRange.commonAncestorContainer;
    if (wordElement.nodeType === Node.TEXT_NODE) {
      currentWordElement = wordElement.parentElement;
    } else {
      currentWordElement = wordElement;
    }
    
    // Ensure the overlay is created
    createReadingOverlay();
    
    // Update the overlay position with precise measurements
    const rect = wordElement.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Add a small padding to make the highlight more visible
    const padding = 1;
    readingOverlay.style.left = `${rect.left + scrollLeft - padding}px`;
    readingOverlay.style.top = `${rect.top + scrollTop - padding}px`;
    readingOverlay.style.width = `${rect.width + (padding * 2)}px`;
    readingOverlay.style.height = `${rect.height + (padding * 2)}px`;
    
    // Make sure the overlay is visible
    readingOverlay.style.display = 'block';
    
    // Log for debugging
    console.log('Highlighting word:', word, 'at index:', wordIndex, 'position:', {
      left: rect.left + scrollLeft,
      top: rect.top + scrollTop,
      width: rect.width,
      height: rect.height
    });
  } catch (error) {
    console.error('Error highlighting word:', error);
  }
}

function updateReadingOverlay(wordElement) {
  if (!readingOverlay || !wordElement) return;
  
  try {
    const rect = wordElement.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Add a small padding to make the highlight more visible
    const padding = 1;
    readingOverlay.style.left = `${rect.left + scrollLeft - padding}px`;
    readingOverlay.style.top = `${rect.top + scrollTop - padding}px`;
    readingOverlay.style.width = `${rect.width + (padding * 2)}px`;
    readingOverlay.style.height = `${rect.height + (padding * 2)}px`;
    
    // Make sure the overlay is visible
    readingOverlay.style.display = 'block';
  } catch (error) {
    console.error('Error updating overlay position:', error);
  }
}

// Clean up when selection changes
document.addEventListener('selectionchange', () => {
  if (currentAudio && currentAudio.paused) {
    removeReadingOverlay();
  }
});

// Handle window scroll
window.addEventListener('scroll', () => {
  if (currentWordElement) {
    updateReadingOverlay(currentWordElement);
  }
});

function createDragContainer() {
  if (!dragContainer) {
    dragContainer = document.createElement('div');
    dragContainer.id = 'elevenlabs-drag-container';
    dragContainer.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100000;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 320px;
    `;
    document.body.appendChild(dragContainer);
  }
}

function createDragHandle() {
  if (!dragHandle) {
    dragHandle = document.createElement('div');
    dragHandle.id = 'elevenlabs-drag-handle';
    dragHandle.title = 'Drag';
    dragHandle.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 40px;
      cursor: grab;
      margin-right: 8px;
      user-select: none;
    `;
    dragHandle.innerHTML = `
      <svg width="16" height="24" viewBox="0 0 16 24">
        <circle cx="4" cy="6" r="2" fill="#bbb"/>
        <circle cx="4" cy="12" r="2" fill="#bbb"/>
        <circle cx="4" cy="18" r="2" fill="#bbb"/>
        <circle cx="12" cy="6" r="2" fill="#bbb"/>
        <circle cx="12" cy="12" r="2" fill="#bbb"/>
        <circle cx="12" cy="18" r="2" fill="#bbb"/>
      </svg>
    `;
    dragHandle.addEventListener('mousedown', startDrag);
  }
}

let dragOffsetX = 0;
let dragOffsetY = 0;
let isDragging = false;

function startDrag(e) {
  isDragging = true;
  userHasDragged = true;
  // Fix: clear right and set left to current position for free movement
  if (dragContainer) {
    const rect = dragContainer.getBoundingClientRect();
    dragContainer.style.left = rect.left + 'px';
    dragContainer.style.right = '';
    dragContainer.style.transform = '';
  }
  const rect = dragContainer.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', stopDrag);
}
function onDragMove(e) {
  if (!isDragging) return;
  dragContainer.style.left = `${e.clientX - dragOffsetX}px`;
  dragContainer.style.top = `${e.clientY - dragOffsetY}px`;
  dragContainer.style.transform = '';
}
function stopDrag() {
  isDragging = false;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', stopDrag);
}

function createSentenceBox() {
  if (!currentSentenceBox) {
    currentSentenceBox = document.createElement('div');
    currentSentenceBox.id = 'elevenlabs-sentence-box';
    currentSentenceBox.style.cssText = `
      background: rgba(255, 255, 255, 0.85);
      padding: 16px 20px 32px 20px;
      border-radius: 10px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
      width: 350px;
      max-height: 288px;
      min-height: 40px;
      line-height: 1.2;
      font-size: 16px;
      transition: opacity 0.2s, height 0.2s;
      overflow-y: auto;
      overflow-x: hidden;
      text-align: left;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      scrollbar-width: thin;
      margin-bottom: 8px;
      margin-top: 10px;
      box-sizing: border-box;
    `;
  }
}

function calculateCost(text) {
  const charCount = text.length;
  const cost = charCount * 0.62 / 1000000;
  return cost.toFixed(4);
}

function calculateAudioDuration(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordsPerSecond = 200 / 60; // 2.5 mots/seconde
  const seconds = words.length / wordsPerSecond;
  return Math.round(seconds);
}

function formatDuration(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function updateCostDisplay(text) {
  let costDisplay = document.getElementById('elevenlabs-cost-display');
  if (!costDisplay) {
    costDisplay = document.createElement('div');
    costDisplay.id = 'elevenlabs-cost-display';
    costDisplay.style.cssText = `
      font-size: 12px;
      color: #666;
      text-align: right;
      padding: 4px 8px 0 8px;
      margin-top: -4px;
      margin-bottom: 0;
      width: 100%;
      box-sizing: border-box;
    `;
    if (dragContainer) {
      dragContainer.insertBefore(costDisplay, currentSentenceBox.nextSibling);
    }
  }
  const cost = calculateCost(text);
  costDisplay.textContent = `Coût estimé: ${cost}€`;

  // Ajout de l'estimation de durée
  let durationDisplay = document.getElementById('elevenlabs-duration-display');
  if (!durationDisplay) {
    durationDisplay = document.createElement('div');
    durationDisplay.id = 'elevenlabs-duration-display';
    durationDisplay.style.cssText = `
      font-size: 12px;
      color: #666;
      text-align: right;
      padding: 0 8px 4px 8px;
      margin-bottom: 8px;
      width: 100%;
      box-sizing: border-box;
    `;
    if (dragContainer) {
      dragContainer.insertBefore(durationDisplay, costDisplay.nextSibling);
    }
  }
  const seconds = calculateAudioDuration(text);
  durationDisplay.textContent = `Durée audio estimée: ${formatDuration(seconds)}`;
}

function renderDragGroup() {
  // Only create containers once
  if (!dragContainer) createDragContainer();
  if (!currentSentenceBox) createSentenceBox();
  if (!toolbarContainer) {
    toolbarContainer = document.createElement('div');
    toolbarContainer.id = 'elevenlabs-toolbar-container';
    toolbarContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%; position: relative; min-height: 40px;';
  }
  if (!dragHandle) createDragHandle();

  // Always update the toolbar UI in the container
  toolbarContainer.innerHTML = '';
  // Render the controls (play/pause, repeat, speedrate)
  renderToolbarUI();
  // Place the toolbar (controls) at the left
  if (toolbar) {
    toolbar.style.position = 'static';
    toolbar.style.background = 'transparent';
    toolbar.style.boxShadow = 'none';
    toolbar.style.border = 'none';
    toolbarContainer.appendChild(toolbar);
  }
  // Place the drag handle at the right
  dragHandle.style.position = 'static';
  dragHandle.style.marginLeft = 'auto';
  dragHandle.style.marginRight = '0';
  toolbarContainer.appendChild(dragHandle);

  // Only append if not already present
  if (!document.body.contains(dragContainer)) {
    document.body.appendChild(dragContainer);
  }
  dragContainer.innerHTML = '';
  dragContainer.appendChild(toolbarContainer);
  dragContainer.appendChild(currentSentenceBox);
  
  // Update cost display if there's selected text
  if (selectedText) {
    updateCostDisplay(selectedText);
  }
}

function updateSentenceBox(text, currentTime) {
  if (!currentSentenceBox) return;

  // If we have alignment and audio is playing, show teleprompter highlight
  if (currentAlignment && currentAudio && !currentAudio.paused) {
    console.log('Current time:', currentTime);
    console.log('Current alignment:', currentAlignment);
    console.log('Original text:', text);
    
    // Get the current word based on timestamps
    const currentWord = currentAlignment.words.find(word => {
      const buffer = 0.05;
      const isCurrent = currentTime >= (word.start - buffer) && currentTime <= (word.end + buffer);
      console.log('Checking word:', word.text, 'start:', word.start, 'end:', word.end, 'isCurrent:', isCurrent);
      return isCurrent;
    });
    
    console.log('Current word:', currentWord);
    
    // Build the text as word spans
    const wordSpans = currentAlignment.words.map((word, index) => {
      const wordSpan = document.createElement('span');
      wordSpan.style.display = 'inline-block';
      wordSpan.textContent = word.text;
      
      // Add space after each word except the last one
      if (index < currentAlignment.words.length - 1) {
        wordSpan.textContent += ' ';
      }
      
      // Check if this is the current word
      const isCurrent = word === currentWord;
      console.log('Creating span for word:', word.text, 'isCurrent:', isCurrent);
      
      if (isCurrent) {
        wordSpan.style.color = '#6c63ff';
        wordSpan.style.transition = 'color 0.2s';
        wordSpan.classList.add('current-word');
      } else {
        wordSpan.style.color = '#111';
        wordSpan.classList.remove('current-word');
      }
      return wordSpan;
    });

    // Clear and update the box
    currentSentenceBox.innerHTML = '';
    const textDiv = document.createElement('div');
    textDiv.style.cssText = 'white-space: pre-wrap; word-break: break-word; width: 100%;';
    
    // If we have word spans, use them
    if (wordSpans.length > 0) {
      wordSpans.forEach(span => textDiv.appendChild(span));
    } else {
      // Fallback to original text if no word spans
      textDiv.textContent = text;
    }
    
    currentSentenceBox.appendChild(textDiv);
    return;
  }

  // Otherwise, show plain text
  currentSentenceBox.innerHTML = '';
  const textDiv = document.createElement('div');
  textDiv.style.cssText = 'white-space: pre-wrap; word-break: break-word; width: 100%;';
  textDiv.textContent = text;
  currentSentenceBox.appendChild(textDiv);
}

// Add CSS for current word highlight
(function() {
  const style = document.createElement('style');
  style.innerHTML = `
    .current-word {
      background: #111 !important;
      color: #fff !important;
      border-radius: 4px;
      padding: 2px 6px;
      margin: 0 2px;
      transition: background 0.2s, color 0.2s;
    }
  `;
  document.head.appendChild(style);
})();

function positionSentenceBox() {
  if (!currentSentenceBox || !toolbar) return;
  const toolbarRect = toolbar.getBoundingClientRect();
  currentSentenceBox.style.top = `${toolbarRect.bottom + 10}px`;
}

// Handle messages from popup
// Keyboard shortcuts management
const SHORTCUTS = {
  'Alt+KeyR': {
    description: 'Sélectionner tous les textes en balises H et P',
    action: () => {
      console.log('Shortcut Alt+R triggered');
      selectAllHeadingsAndParagraphs();
    }
  },
  'Alt+KeyS': {
    description: 'Sélectionner le texte actuel',
    action: () => {
      console.log('Shortcut Alt+S triggered');
      selectCurrentText();
    }
  },
  'Alt+KeyP': {
    description: 'Lire le texte sélectionné',
    action: () => {
      console.log('Shortcut Alt+P triggered');
      playSelectedText();
    }
  }
};

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
  console.log('Initializing keyboard shortcuts');
  
  // Add keyboard event listener to window instead of document
  window.addEventListener('keydown', (e) => {
    // Log key event for debugging
    console.log('Key pressed:', {
      key: e.key,
      code: e.code,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey
    });
    
    // Create shortcut string using the key code
    const shortcut = `${e.altKey ? 'Alt+' : ''}${e.code}`;
    console.log('Checking shortcut:', shortcut);
    
    if (SHORTCUTS[shortcut]) {
      console.log('Shortcut matched:', shortcut);
      e.preventDefault();
      e.stopPropagation();
      SHORTCUTS[shortcut].action();
    }
  }, true);

  // Add keyboard event listener to document as backup
  document.addEventListener('keydown', (e) => {
    const shortcut = `${e.altKey ? 'Alt+' : ''}${e.code}`;
    if (SHORTCUTS[shortcut]) {
      e.preventDefault();
      e.stopPropagation();
      SHORTCUTS[shortcut].action();
    }
  }, true);
}

// Select all headings and paragraphs
function selectAllHeadingsAndParagraphs() {
  console.log('Selecting all headings and paragraphs (visual selection)');
  const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
  if (elements.length === 0) {
    console.log('No headings or paragraphs found');
    return;
  }

  const selection = window.getSelection();
  selection.removeAllRanges();

  // Créer un range du début du premier élément à la fin du dernier
  const first = elements[0];
  const last = elements[elements.length - 1];
  const range = document.createRange();
  range.setStart(first, 0);
  // Trouver le dernier noeud texte du dernier élément
  let lastNode = last;
  while (lastNode.lastChild) lastNode = lastNode.lastChild;
  if (lastNode.nodeType === Node.TEXT_NODE) {
    range.setEnd(lastNode, lastNode.textContent.length);
  } else {
    range.setEnd(last, last.childNodes.length);
  }
  selection.addRange(range);

  console.log('Visual selection completed, elements selected:', elements.length);
  // Déclencher l'événement selectionchange
  const event = new Event('selectionchange');
  document.dispatchEvent(event);
}

// Select current text (if any)
function selectCurrentText() {
  console.log('Selecting current text');
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text) {
    console.log('Text selected:', text.substring(0, 50) + '...');
    // If there's already a selection, trigger the text-to-speech
    const event = new Event('selectionchange');
    document.dispatchEvent(event);
  } else {
    console.log('No text currently selected');
  }
}

// Play selected text
function playSelectedText() {
  console.log('Playing selected text');
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text) {
    console.log('Sending text to speech:', text.substring(0, 50) + '...');
    // Send message to background script to convert text to speech
    chrome.runtime.sendMessage({
      action: 'convertToSpeech',
      text: text
    });
  } else {
    console.log('No text selected to play');
  }
}

// Initialize keyboard shortcuts when the content script loads
console.log('Content script loaded, initializing keyboard shortcuts');
initKeyboardShortcuts();

function showRecordingAnimation() {
  if (recordingOverlay) return;
  recordingOverlay = document.createElement('div');
  recordingOverlay.id = 'recording-overlay';
  recordingOverlay.style.cssText = `
    position: fixed; top: 30px; right: 30px; z-index: 999999;
    width: 48px; height: 48px; border-radius: 50%;
    background: rgba(220, 38, 38, 0.92);
    box-shadow: 0 0 8px 2px #dc2626;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 1.7em; font-weight: bold;
    font-family: monospace;
    animation: pulse 1s infinite;
  `;
  recordingOverlay.innerHTML = '<span>●</span>';
  document.body.appendChild(recordingOverlay);

  // Animation CSS
  if (!document.getElementById('recording-pulse-style')) {
    const style = document.createElement('style');
    style.id = 'recording-pulse-style';
    style.innerHTML = `
      @keyframes pulse {
        0% { box-shadow: 0 0 8px 2px #dc2626; }
        50% { box-shadow: 0 0 18px 6px #dc2626; }
        100% { box-shadow: 0 0 8px 2px #dc2626; }
      }
    `;
    document.head.appendChild(style);
  }
}

function hideRecordingAnimation() {
  if (recordingOverlay) {
    recordingOverlay.remove();
    recordingOverlay = null;
  }
}

function showLoader() {
  if (recordingOverlay) {
    recordingOverlay.innerHTML = '<span style="font-size:1.3em;">⏳</span>';
    recordingOverlay.style.background = 'rgba(30,30,30,0.95)';
    recordingOverlay.style.boxShadow = '0 0 8px 2px #333';
    recordingOverlay.style.animation = 'none';
  }
}

function showTranscribedText(text, isError = false) {
  if (!visualizerBox) showVisualizerBox();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
  if (!isError) {
    visualizerCtx.font = 'bold 18px sans-serif';
    visualizerCtx.fillStyle = '#111';
    visualizerCtx.textAlign = 'center';
    visualizerCtx.fillText(text, visualizerCanvas.width / 2, visualizerCanvas.height / 2 + 8);
    setTimeout(hideVisualizerBox, 5000);
    // Coller automatiquement si focus sur un champ éditable
    if (lastActiveElement) {
      pasteTextToActiveElement(text);
      lastActiveElement = null;
    }
  } else {
    setTimeout(hideVisualizerBox, 100);
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Texte copié dans le presse-papier');
  } catch (e) {
    console.warn('Impossible de copier dans le presse-papier', e);
  }
}

window.addEventListener('keydown', async (e) => {
  if (e.altKey && e.code === 'Backquote' && !altBackquoteIsDown) {
    altBackquoteIsDown = true;
    
    if (!isRecording) {
      // Démarrage de l'enregistrement
      isRecording = true;
      audioChunks = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunks.push(event.data);
        };
        mediaRecorder.start();
        startVoiceVisualizer(stream);
      } catch (err) {
        isRecording = false;
        alert('Impossible d\'acceder au micro');
      }
    } else {
      // Arrêt de l'enregistrement et transcription
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        stopVoiceVisualizer();
        startLoadingWave();
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'audio.webm');
          try {
            console.log('[DeepInfra API] Sending audio...');
            const response = await fetch('https://api.deepinfra.com/v1/inference/openai/whisper-large-v3-turbo', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + userApiKey
              },
              body: formData
            });
            console.log('[DeepInfra API] Response status:', response.status);
            let data = null;
            try {
              data = await response.json();
              console.log('[DeepInfra API] Response JSON:', data);
            } catch (jsonErr) {
              console.error('[DeepInfra API] JSON parse error:', jsonErr);
              isRecording = false;
              return;
            }
            if (data && data.text) {
              insertTextInPage(data.text);
              hideVisualizerBox();
            }
          } catch (err) {
            console.error('[DeepInfra API] Fetch error:', err);
            hideVisualizerBox();
          }
          isRecording = false;
        };
      }
    }
  }
}, true);

// On écoute toujours le keyup sur window
window.addEventListener('keyup', (e) => {
  if (e.code === 'Backquote' || !e.altKey) {
    altBackquoteIsDown = false;
  }
}, true);

function showVisualizerBox() {
  if (!visualizerBox) {
    visualizerBox = document.createElement('div');
    visualizerBox.id = 'voice-visualizer-box';
    visualizerBox.style.cssText = `
      position: fixed; top: 30px; right: 30px; z-index: 2147483647;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      width: 420px; height: 90px;
      border-radius: 22px;
      background: rgba(255,255,255,0.18);
      box-shadow: 0 4px 32px 0 rgba(0,0,0,0.12);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1.5px solid rgba(0,0,0,0.08);
      overflow: hidden;
      transition: box-shadow 0.2s;
    `;
    visualizerCanvas = document.createElement('canvas');
    visualizerCanvas.width = 400;
    visualizerCanvas.height = 60;
    visualizerCanvas.style.cssText = `
      background: transparent;
      width: 400px; height: 60px;
      display: block;
      margin-top: 10px;
    `;
    visualizerBox.appendChild(visualizerCanvas);
    document.body.appendChild(visualizerBox);
    visualizerCtx = visualizerCanvas.getContext('2d');
  }
  visualizerBox.style.display = 'flex';
}

function hideVisualizerBox() {
  if (visualizerBox) {
    visualizerBox.style.display = 'none';
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  analyser = null;
  dataArray = null;
  source = null;
  scrollBuffer = [];
}

// --- Nouvelle animation vague symétrique centrée ---
function animateSuperposedWave({useAudio = false, useWave = true}) {
  if ((useAudio && !analyser) || !visualizerCtx) return;
  animationFrameId = requestAnimationFrame(() => animateSuperposedWave({useAudio, useWave}));

  // Préparation du buffer audio
  if (scrollBuffer.length < BAR_COUNT) {
    scrollBuffer = Array(BAR_COUNT).fill(0);
  }
  
  let audioLevel = 0;
  if (useAudio && analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    
    // Calcul du niveau audio instantané
    const instantLevel = Math.pow(dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255, 2.0);
    
    // Mise à jour du niveau cible
    targetAudioLevel = instantLevel * 5.0; // Amplification x5
    
    // Limiter pour éviter la sur-saturation
    targetAudioLevel = Math.min(1, targetAudioLevel);
    
    // Smoothing avec attaque et relâchement différents (comme un compresseur audio)
    if (targetAudioLevel > lastAudioLevel) {
      // Phase d'attaque - monte plus rapidement
      lastAudioLevel += (targetAudioLevel - lastAudioLevel) * attackRate;
    } else {
      // Phase de relâchement - descend plus lentement
      lastAudioLevel += (targetAudioLevel - lastAudioLevel) * releaseRate;
    }
    
    // Appliquer un lissage supplémentaire pour les mouvements plus fluides
    audioLevel = lastAudioLevel;
    
    // Ajouter une légère augmentation pour les niveaux élevés, mais avec lissage
    if (audioLevel > 0.3) {
      const boostAmount = audioLevel ; // Boost moins agressif
      audioLevel = Math.min(1, audioLevel * (1 + boostAmount));
    }
  } else {
    // Animation continue même sans audio (vague harmonieuse)
    const instantLevel = 0.5 + 0.5 * Math.sin(Date.now() / 400);
    
    // Utiliser le même système de smoothing pour l'animation de chargement
    targetAudioLevel = instantLevel;
    lastAudioLevel += (targetAudioLevel - lastAudioLevel) * smoothingFactor;
    audioLevel = lastAudioLevel;
  }
  
  scrollBuffer.push(audioLevel);
  if (scrollBuffer.length > BAR_COUNT) scrollBuffer.shift();

  // Dessin
  visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
  const barCount = BAR_COUNT;
  const barWidth = visualizerCanvas.width / barCount;
  const now = Date.now() / 600;
  const centerY = visualizerCanvas.height / 2;
  const padding = 10;
  
  // Ajuster la taille maximale de la barre selon qu'on est en enregistrement ou en loading
  let maxBarHeight;
  if (useAudio) {
    // Plus petites barres pendant l'enregistrement (50%)
    maxBarHeight = ((visualizerCanvas.height / 2) - padding) * 0.5;
  } else {
    // Taille normale pendant le loading
    maxBarHeight = (visualizerCanvas.height / 2) - padding;
  }

  // Animation de droite à gauche (au lieu de symétrique)
  // Phase de l'animation pour créer un défilement 1.5x plus rapide
  const phaseShift = (Date.now() % 6667) / 6667; // 0 à 1 sur ~6.7 secondes (10000/1.5)
  
  for (let i = 0; i < barCount; i++) {
    // Position relative dans la vague (0 à 1)
    const pos = i / barCount;
    
    // Calcul de la position avec décalage pour effet de défilement
    const wavePos = (pos + phaseShift) % 1.0;
    
    // Créer plusieurs vagues superposées avec des fréquences différentes
    const wave1 = Math.sin(wavePos * Math.PI * 4) * 0.5 + 0.5;
    const wave2 = Math.sin(wavePos * Math.PI * 6 + now * 0.5) * 0.3 + 0.5;
    const wave3 = Math.sin(wavePos * Math.PI * 2 - now * 0.3) * 0.2 + 0.5;
    
    // Combiner les vagues pour un effet plus organique
    let wave = (wave1 * 0.6 + wave2 * 0.3 + wave3 * 0.1);
    
    // Superposition de l'impact audio
    let amplitude;
    if (useAudio) {
      // Pendant l'enregistrement: vagues avec amplitude lissée
      amplitude = wave * (0.2 + audioLevel * 3.0); // Un peu moins d'amplification (3x au lieu de 4x)
    } else {
      // Pendant le loading: vagues normales
      amplitude = wave * (0.5 + audioLevel * 1.2);
    }
    
    const barHeight = Math.max(2, amplitude * maxBarHeight);

    // Dessiner la barre (50% plus fine)
    visualizerCtx.fillStyle = '#111';
    visualizerCtx.fillRect(
      i * barWidth,
      centerY - barHeight,
      barWidth * 0.35, // 50% plus fine que 0.7
      barHeight * 2  // Hauteur symétrique au-dessus et en-dessous du centre
    );
  }
}

// --- Intégration dans la logique d'enregistrement ---
function startVoiceVisualizer(stream) {
  showVisualizerBox();
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  animateSuperposedWave({useAudio: true, useWave: true});
}

function stopVoiceVisualizer() {
  hideVisualizerBox();
}

function startLoadingWave() {
  showVisualizerBox();
  animateSuperposedWave({useAudio: false, useWave: true});
}

// --- Coller automatiquement le texte dans le champ éditable ---
async function pasteTextToActiveElement(text) {
  // Toujours copier dans le presse-papier, peu importe le contexte
  try {
    await navigator.clipboard.writeText(text);
    console.log('Texte copié dans le presse-papier');
  } catch (e) {
    console.warn('Impossible de copier dans le presse-papier', e);
  }

  // Si on est dans un champ éditable, coller le texte
  const activeElement = document.activeElement;
  if (activeElement && (
    activeElement.tagName === 'TEXTAREA' || 
    (activeElement.tagName === 'INPUT' && /text|search|email|url|tel|password/.test(activeElement.type)) ||
    activeElement.isContentEditable
  )) {
    // Pour textarea ou input
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const value = activeElement.value;
      activeElement.value = value.slice(0, start) + text + value.slice(end);
      // Replace le curseur après le texte collé
      activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
      activeElement.focus();
    }
    // Pour contenteditable
    else if (activeElement.isContentEditable) {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        sel.deleteFromDocument();
        sel.getRangeAt(0).insertNode(document.createTextNode(text));
        // Replace le curseur après le texte collé
        sel.collapseToEnd();
      }
      activeElement.focus();
    }
  }
}

// --- Fonction pour jouer le son de notification ---
function playNotificationSound() {
  try {
    // Créer un élément audio avec le son de notification macOS
    const audio = new Audio('data:audio/mp3;base64,SUQzAwAAAAAfdlRJVDIAAAAZAAAARWxldmVuTGFicyBOb3RpZmljYXRpb24AAAAAAAAAAAA=');
    audio.volume = 0.5;
    audio.play();
    
    // Afficher un message de confirmation
    showCopyConfirmation("Texte copié dans le presse-papier");
  } catch (error) {
    console.error('Erreur lors de la lecture du son de notification:', error);
  }
}

// --- Fonction pour afficher un message de confirmation ---
function showCopyConfirmation(message) {
  // Créer un élément pour afficher le message
  const confirmationMsg = document.createElement('div');
  confirmationMsg.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
    pointer-events: none;
  `;
  confirmationMsg.textContent = message;
  document.body.appendChild(confirmationMsg);
  
  // Animer l'apparition
  setTimeout(() => {
    confirmationMsg.style.opacity = '1';
  }, 10);
  
  // Disparaître après 2 secondes
  setTimeout(() => {
    confirmationMsg.style.opacity = '0';
    setTimeout(() => {
      confirmationMsg.remove();
    }, 300);
  }, 2000);
}

function createActionMenu() {
  if (actionMenu) actionMenu.remove();
  actionMenu = document.createElement('div');
  actionMenu.id = 'elevenlabs-action-menu';
  actionMenu.style.cssText = `
    position: absolute;
    z-index: 100001;
    display: flex;
    gap: 8px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.10);
    border: 1px solid #e5e7eb;
    padding: 8px 14px;
    align-items: center;
    transition: box-shadow 0.2s;
  `;

  // Vérifier la clé API avant d'afficher les boutons
  chrome.storage.sync.get(['deepinfraApiKey'], (result) => {
    const apiKey = result.deepinfraApiKey;
    if (!apiKey) {
      // Afficher uniquement le bouton Add API key
      const addKeyBtn = document.createElement('button');
      addKeyBtn.textContent = 'Add API key';
      addKeyBtn.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        color: #111;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 6px 16px;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        box-shadow: none;
        transition: background 0.15s;
      `;
      addKeyBtn.onmouseover = () => { addKeyBtn.style.background = '#f3f3f3'; };
      addKeyBtn.onmouseout = () => { addKeyBtn.style.background = '#fff'; };
      addKeyBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        chrome.runtime.sendMessage({ action: 'openExtensionPopup' });
      };
      addKeyBtn.addEventListener('mousedown', (e) => e.preventDefault());
      actionMenu.appendChild(addKeyBtn);
      if (!document.body.contains(actionMenu)) document.body.appendChild(actionMenu);
      window.addEventListener('scroll', handleStickyBehavior);
      // hideMicroButton(); // SUPPRIMÉ : ne plus cacher le microbutton lors de la sélection
      return;
    }
    // Si la clé API est présente, afficher les boutons d'action
    chrome.storage.sync.get(['actionButtonsSettings'], (settingsResult) => {
      const capturedText = selectedText;
      const settings = settingsResult.actionButtonsSettings || [];
      // Style de la barre plus fine et blanche
      actionMenu.style.cssText = `
        position: absolute;
        z-index: 100001;
        display: flex;
        gap: 0px;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #e5e7eb;
        padding: 0px 0px;
        align-items: center;
        min-height: 28px;
        transition: box-shadow 0.2s;
      `;
      // DEBUG: log settings
      console.log('[Octo] ActionMenu settings:', settings);

      if (Array.isArray(settings) && settings.length > 0) {
        settings.forEach(btn => {
          const button = document.createElement('button');
          button.textContent = btn.label || btn.title || btn.id || 'Action';
          button.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #fff;
            color: #111;
            border: none;
            border-radius: 8px;
            padding: 0 16px;
            font-weight: 500;
            font-size: 12px;
            cursor: pointer;
            box-shadow: none;
            transition: background 0.15s;
            margin-right: 0px;
            height: 28px;
            min-width: 48px;
          `;
          button.onmouseover = () => { button.style.background = '#f3f3f3'; };
          button.onmouseout = () => { button.style.background = '#fff'; };
          button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCustomAction(btn.id, capturedText);
          };
          button.addEventListener('mousedown', (e) => e.preventDefault());
          actionMenu.appendChild(button);
        });
      } else {
        // Fallback: bouton de correction simple
        const correctBtn = document.createElement('button');
        correctBtn.textContent = 'Correct';
        correctBtn.style.cssText = `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: #111;
          border: none;
          border-radius: 8px;
          padding: 0 16px;
          font-weight: 500;
          font-size: 12px;
          cursor: pointer;
          box-shadow: none;
          transition: background 0.15s;
          height: 28px;
          min-width: 48px;
        `;
        correctBtn.onmouseover = () => { correctBtn.style.background = '#f3f3f3'; };
        correctBtn.onmouseout = () => { correctBtn.style.background = '#fff'; };
        correctBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCorrectGrammar(capturedText);
        };
        correctBtn.addEventListener('mousedown', (e) => e.preventDefault());
        actionMenu.appendChild(correctBtn);
      }
      // Bouton Read (icône) à droite
      if (isReadButtonVisible) {
        const readBtn = document.createElement('button');
        readBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        readBtn.style.cssText = `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: #111;
          border: none;
          border-radius: 8px;
          padding: 0 10px;
          font-weight: 500;
          font-size: 12px;
          cursor: pointer;
          box-shadow: none;
          transition: background 0.15s;
          margin-left: 4px;
          height: 28px;
          min-width: 32px;
        `;
        readBtn.onmouseover = () => { readBtn.style.background = '#f3f3f3'; };
        readBtn.onmouseout = () => { readBtn.style.background = '#fff'; };
        readBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleReadText(capturedText);
        };
        readBtn.addEventListener('mousedown', (e) => e.preventDefault());
        actionMenu.appendChild(readBtn);
      }
      if (!document.body.contains(actionMenu)) document.body.appendChild(actionMenu);
      window.addEventListener('scroll', handleStickyBehavior);
    });
  });
}

// --- Custom Action Handler for Action Menu Buttons ---
function handleCustomAction(buttonId, text) {
  if (!text) return;
  selectedText = text;

  // Save selection/caret for later replacement
  const selection = window.getSelection();
  const activeElement = document.activeElement;
  if (isEditableElement(activeElement)) {
    lastActiveEditableElement = activeElement;
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      lastInputSelection = {
        start: activeElement.selectionStart,
        end: activeElement.selectionEnd
      };
    } else if (activeElement.isContentEditable && selection.rangeCount > 0) {
      lastSelectionRange = selection.getRangeAt(0).cloneRange();
    }
  } else {
    lastActiveEditableElement = null;
    lastInputSelection = null;
    lastSelectionRange = null;
  }
  // Load user settings for this button
  chrome.storage.sync.get(['actionButtonsSettings'], (result) => {
    const settings = result.actionButtonsSettings || [];
    const btn = settings.find(b => b.id === buttonId);
    if (!btn) {
      hideCorrectionLoader();
      alert('No settings found for this action button.');
      return;
    }
    const prompt = btn.prompt.replace(/{{text}}/g, selectedText);
    if (btn.sidechat) {
      const newChatId = crypto.randomUUID();
      // Send sidechat flag and the new chat ID
      chrome.runtime.sendMessage({
        action: 'customAction',
        buttonId,
        text: selectedText,
        prompt,
        model: btn.model,
        sidechat: true,
        chatId: newChatId
      });
      showSideChat({
        prompt,
        context: selectedText,
        model: btn.model,
        isNew: true,
        chatId: newChatId
      });
    } else {
      showCorrectionLoader();
      chrome.runtime.sendMessage({
        action: 'customAction',
        buttonId,
        text: selectedText,
        prompt,
        model: btn.model,
        sidechat: false
      });
    }
  });
}

// Variables pour le comportement sticky
let isMenuSticky = false;
let selectionRect = null;
let initialMenuTop = 0;

function handleStickyBehavior() {
  if (!actionMenu || !selectionRect) return;
  
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const viewportHeight = window.innerHeight;
  
  // Si la sélection sort du viewport ou dépasse une certaine hauteur
  const selectionTop = selectionRect.top + scrollTop;
  const selectionBottom = selectionRect.bottom + scrollTop;
  const selectionHeight = selectionRect.height;
  
  // Vérifier si la sélection est trop grande ou sort du viewport
  const isSelectionTooTall = selectionHeight > viewportHeight * 0.5; // 50% de la hauteur du viewport
  const isSelectionOutOfView = selectionTop < scrollTop || selectionBottom > scrollTop + viewportHeight;
  
  if ((isSelectionTooTall || isSelectionOutOfView) && !isMenuSticky) {
    // Passer en mode sticky
    actionMenu.style.position = 'fixed';
    actionMenu.style.top = '12px';
    actionMenu.style.left = '50%';
    actionMenu.style.transform = 'translateX(-50%)';
    isMenuSticky = true;
  } else if (!isSelectionTooTall && !isSelectionOutOfView && isMenuSticky) {
    // Revenir à la position normale
    actionMenu.style.position = 'absolute';
    actionMenu.style.top = `${initialMenuTop}px`;
    actionMenu.style.left = `${selectionRect.left + selectionRect.width / 2}px`;
    actionMenu.style.transform = 'translateX(-50%)';
    isMenuSticky = false;
  }
}

function positionActionMenu(selection) {
  if (!actionMenu) return;
  
  try {
    // Obtenir le rectangle englobant la sélection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    selectionRect = rect; // Stocker pour le comportement sticky
    
    // Calculer la position optimale - centrée au-dessus de la sélection
    const menuWidth = actionMenu.offsetWidth || 300; // Fallback si offsetWidth n'est pas encore disponible
    
    // Centrer le menu horizontalement au-dessus de la sélection
    let left = window.scrollX + rect.left + (rect.width / 2);
    
    // S'assurer que le menu reste dans les limites de la fenêtre horizontalement
    const viewportWidth = window.innerWidth;
    if (left - menuWidth/2 < window.scrollX + 20) {
      left = window.scrollX + menuWidth/2 + 20; // Garder une marge à gauche
    } else if (left + menuWidth/2 > window.scrollX + viewportWidth - 20) {
      left = window.scrollX + viewportWidth - menuWidth/2 - 20; // Garder une marge à droite
    }
    
    // Positionner le menu au-dessus de la sélection avec un décalage
    let top = window.scrollY + rect.bottom + 10;
    initialMenuTop = top; // Stocker pour le comportement sticky
    
    // Si le menu dépasse en haut, le placer en dessous de la sélection
    if (top < window.scrollY + 12) {
      top = window.scrollY + rect.bottom + 10;
      initialMenuTop = top;
    }
    
    // Appliquer le positionnement
    actionMenu.style.left = `${left}px`;
    actionMenu.style.top = `${top}px`;
    actionMenu.style.transform = 'translateX(-50%) translateY(4px)'; // Centre horizontalement et léger décalage vertical
    
    // Animation d'apparition
    actionMenu.style.display = 'flex';
    actionMenu.style.opacity = '0';
    
    setTimeout(() => {
      actionMenu.style.opacity = '1';
      actionMenu.style.transform = 'translateX(-50%) translateY(0)';
    }, 0);
    
    // Vérifier si le comportement sticky doit être appliqué immédiatement
    handleStickyBehavior();
    
  } catch (error) {
    console.log('Error positioning menu:', error);
    // Fallback simple en cas d'erreur
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    actionMenu.style.left = '50%';
    actionMenu.style.top = `${window.scrollY + 20}px`;
    actionMenu.style.transform = 'translateX(-50%)';
    actionMenu.style.display = 'flex';
    actionMenu.style.opacity = '1';
  }
}

function handleReadText(text) {
  if (!text) return;
  selectedText = text;

  toolbarState = 'loading';
  showTtsSidebar();
  
  chrome.runtime.sendMessage({
    action: 'convertToSpeech',
    text: text
  });
}

function removeActionMenu() {
  if (actionMenu) {
    actionMenu.remove();
    actionMenu = null;
    window.removeEventListener('scroll', handleStickyBehavior);
    isMenuSticky = false;
    selectionRect = null;
  }
}

// --- Track focus on editable elements to show micro button ---

function isEditableElement(element) {
  return element && (
    element.tagName === 'TEXTAREA' || 
    (element.tagName === 'INPUT' && /text|search|email|url|tel|password/.test(element.type)) ||
    element.isContentEditable
  );
}

function showMicroButton() {
  // Create button if it doesn't exist
  if (!microButton) {
    microButton = document.createElement('button');
    microButton.id = 'elevenlabs-micro-button';
    microButton.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 25px;
      width: 55px;
      height: 55px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2147483647;
      padding: 0;
      opacity: 0;
      pointer-events: none;
    `;
    updateMicroButtonIcon(false);
    
    microButton.addEventListener('mouseover', () => { if (!isMicroButtonRecording) microButton.style.background = '#f5f5f5'; });
    microButton.addEventListener('mouseout', () => { if (!isMicroButtonRecording) microButton.style.background = '#ffffff'; });
    
    microButton.addEventListener('mousedown', startMicroButtonDrag);
    microButton.addEventListener('click', (e) => {
      if (microButtonWasDragged) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      triggerRecording();
    });
    
    document.body.appendChild(microButton);
  }
  
  // Make it visible and ready for fade-in
  microButton.style.display = 'flex';
  microButton.style.visibility = 'visible';
  
  // Use a small timeout to trigger the fade-in animation
  setTimeout(() => {
    if (microButton) {
      microButton.style.opacity = '1';
      microButton.style.pointerEvents = 'auto';
    }
  }, 10);
}

function updateMicroButtonIcon(isRecording) {
  if (!microButton) return;
  
  if (isRecording) {
    // Black background with white icon
    microButton.style.background = '#111111';
    microButton.style.borderColor = '#111111';
    microButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    `;
    microButton.classList.add('recording');
  } else {
    // White background with black icon
    microButton.style.background = '#ffffff';
    microButton.style.borderColor = '#e5e7eb';
    microButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    `;
    microButton.classList.remove('recording');
  }
}

function positionMicroButtonAtCaret(targetElement) {
  // No-op
}

function hideMicroButton() {
  if (microButton) {
    // Start the fade-out
    microButton.style.opacity = '0';
    microButton.style.pointerEvents = 'none';

    // Wait for the transition to finish before hiding it completely
    setTimeout(() => {
      if (microButton) {
        microButton.style.display = 'none';
        microButton.style.visibility = 'hidden';
      }
    }, 200); // This should match the CSS transition duration
  }
}

// Reset inactivity timer on user interaction in editable fields
['click', 'keydown', 'input'].forEach(evt => {
  document.addEventListener(evt, (e) => {
    if (activeEditableElement && document.activeElement === activeEditableElement) {
      if (microButton && microButton.style.display !== 'none') {
        microButton.style.opacity = '1';
        microButton.style.transform = 'scale(1)';
      }
      resetMicInactivityTimer();
    }
  }, true);
});

// Reposition micro button on window scroll and resize
window.addEventListener('scroll', () => {
  if (activeEditableElement) {
    // La logique de repositionnement a été retirée, mais on garde le listener au cas où
  }
});

window.addEventListener('resize', () => {
  if (activeEditableElement) {
    // La logique de repositionnement a été retirée, mais on garde le listener au cas où
  }
});

async function triggerRecording() {
  const apiKey = await new Promise(resolve => {
    chrome.storage.sync.get(['deepinfraApiKey'], result => resolve(result.deepinfraApiKey));
  });

  if (!apiKey) {
    chrome.runtime.sendMessage({ action: 'openExtensionPopup' });
    return;
  }

  if (!isRecording) {
    // Start recording
    isRecording = true;
    audioChunks = [];
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };
        mediaRecorder.start();
        startVoiceVisualizer(stream);
    } catch (err) {
        isRecording = false;
        alert('Impossible d\'acceder au micro');
    }
  } else {
    // Stop recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        stopVoiceVisualizer();
        startLoadingWave();

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');
            try {
                console.log('[DeepInfra API] Sending audio...');
                const userApiKey = await new Promise(resolve => {
                    chrome.storage.sync.get(['deepinfraApiKey'], result => resolve(result.deepinfraApiKey));
                });
                const response = await fetch('https://api.deepinfra.com/v1/inference/openai/whisper-large-v3-turbo', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + userApiKey
                    },
                    body: formData
                });
                console.log('[DeepInfra API] Response status:', response.status);
                let data = null;
                try {
                    data = await response.json();
                    console.log('[DeepInfra API] Response JSON:', data);
                } catch (jsonErr) {
                    console.error('[DeepInfra API] JSON parse error:', jsonErr);
                    isRecording = false; // Important to reset state
                    return;
                }
                if (data && data.text) {
                    insertTextInPage(data.text);
                    hideVisualizerBox();
                }
            } catch (err) {
                console.error('[DeepInfra API] Fetch error:', err);
                hideVisualizerBox();
            }
            isRecording = false; // Reset state after completion/error
        };
    }
  }
}

// Handle events specifically for carets in editable fields
function initCaretTracking() {
  // No-op
}

// Initialiser le suivi du curseur après le chargement de la page
document.addEventListener('DOMContentLoaded', initCaretTracking);
// Aussi l'initialiser immédiatement au cas où le script est chargé après DOMContentLoaded
initCaretTracking();

// Nouvelle fonction pour restaurer le caret et coller le texte à la position du clic initial
async function restoreCaretAndPasteText(text) {
  if (!lastClickPosition || !lastClickPosition.element) {
    // Fallback : coller normalement
    await pasteTextToActiveElement(text);
    return;
  }
  const el = lastClickPosition.element;
  el.focus();
  // Pour textarea/input
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    // Calculer la position du caret en fonction du clic
    // On va approximer en fonction de la longueur du texte et de la largeur du champ
    const rect = el.getBoundingClientRect();
    const x = lastClickPosition.x - rect.left;
    const value = el.value;
    // Approximation : position proportionnelle
    const pos = Math.round((x / rect.width) * value.length);
    el.selectionStart = el.selectionEnd = Math.max(0, Math.min(value.length, pos));
    // Coller le texte
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.value = value.slice(0, start) + text + value.slice(end);
    el.selectionStart = el.selectionEnd = start + text.length;
    el.focus();
  } else if (el.isContentEditable) {
    // Pour contenteditable, placer le caret au point de clic
    const range = document.caretRangeFromPoint
      ? document.caretRangeFromPoint(lastClickPosition.x, lastClickPosition.y)
      : document.caretPositionFromPoint
        ? (() => {
            const pos = document.caretPositionFromPoint(lastClickPosition.x, lastClickPosition.y);
            if (!pos) return null;
            const r = document.createRange();
            r.setStart(pos.offsetNode, pos.offset);
            r.collapse(true);
            return r;
          })()
        : null;
    if (range) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      // Coller le texte
      document.execCommand('insertText', false, text);
      sel.collapseToEnd();
    } else {
      // Fallback : coller à la fin
      el.focus();
      document.execCommand('insertText', false, text);
    }
  } else {
    // Fallback : coller normalement
    await pasteTextToActiveElement(text);
  }
}

// Nouvelle fonction pour gérer la correction grammaticale
function handleCorrectGrammar(text) {
  if (!text) return;
  selectedText = text;

  // Sauvegarder la sélection/caret
  const selection = window.getSelection();
  const activeElement = document.activeElement;
  if (isEditableElement(activeElement)) {
    lastActiveEditableElement = activeElement;
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      lastInputSelection = {
        start: activeElement.selectionStart,
        end: activeElement.selectionEnd
      };
    } else if (activeElement.isContentEditable && selection.rangeCount > 0) {
      lastSelectionRange = selection.getRangeAt(0).cloneRange();
    }
  } else {
    lastActiveEditableElement = null;
    lastInputSelection = null;
    lastSelectionRange = null;
  }
  showCorrectionLoader();
  chrome.runtime.sendMessage({
    action: 'correctGrammar',
    text: selectedText
  });
}

function showCorrectionLoader() {
  hideCorrectionLoader();
  correctionLoader = document.createElement('div');
  correctionLoader.id = 'elevenlabs-correction-loader';
  correctionLoader.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: #fffbe6;
    color: #bfa100;
    border: 1px solid #ffe066;
    border-radius: 8px;
    padding: 8px 18px;
    font-size: 15px;
    font-family: inherit;
    z-index: 2147483647;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  correctionLoader.innerHTML = `<span class="el-spinner" style="display:inline-block;width:18px;height:18px;border:3px solid #ffe066;border-top:3px solid #bfa100;border-radius:50%;animation:elspin 1s linear infinite;"></span> Rédaction en cours...`;
  document.body.appendChild(correctionLoader);
  // Spinner keyframes
  if (!document.getElementById('el-correction-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'el-correction-spinner-style';
    style.innerHTML = `@keyframes elspin{to{transform:rotate(360deg)}}`;
    document.head.appendChild(style);
  }
}
function hideCorrectionLoader() {
  if (correctionLoader) {
    correctionLoader.remove();
    correctionLoader = null;
  }
}
function showCorrectionLabel() {
  hideCorrectionLabel();
  const label = document.createElement('div');
  label.id = 'elevenlabs-correction-label';
  label.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: #e6ffed;
    color: #1a7f37;
    border: 1px solid #b7eb8f;
    border-radius: 8px;
    padding: 8px 18px;
    font-size: 15px;
    font-family: inherit;
    z-index: 2147483647;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    text-align: center;
    opacity: 1;
    transition: opacity 0.5s ease;
  `;
  label.textContent = 'Texte corrigé copié';
  document.body.appendChild(label);
  correctionLabelTimeout = setTimeout(() => {
    label.style.opacity = '0';
    setTimeout(() => { label.remove(); }, 500);
  }, 2000);
}
function hideCorrectionLabel() {
  const label = document.getElementById('elevenlabs-correction-label');
  if (label) label.remove();
  if (correctionLabelTimeout) clearTimeout(correctionLabelTimeout);
}

function animateInputHighlight(element) {
  removeInputHighlight();
  element.classList.add('elevenlabs-animating-input');
}
function removeInputHighlight() {
  document.querySelectorAll('.elevenlabs-animating-input').forEach(el => {
    el.classList.remove('elevenlabs-animating-input');
  });
}

function animateDomSelection(selection) {
  removeSelectionHighlight();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  // Pour chaque nœud texte dans la sélection, on le remplace par un span animé
  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, {
    acceptNode: function(node) {
      // Garder seulement les nœuds dans la sélection
      const nodeRange = document.createRange();
      nodeRange.selectNodeContents(node);
      return (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0 &&
              range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0)
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  let node;
  while ((node = walker.nextNode())) {
    const span = document.createElement('span');
    span.className = 'elevenlabs-animating-selection';
    span.textContent = node.textContent;
    node.parentNode.replaceChild(span, node);
  }
}

function removeSelectionHighlight() {
  document.querySelectorAll('.elevenlabs-animating-selection').forEach(span => {
    if (span.parentNode) {
      span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
    }
  });
}

// Fonction utilitaire pour remplacer le texte sélectionné dans la page
function replaceSelectedText(newText) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(newText));
  // Optionnel : replacer le curseur après le texte collé
  selection.removeAllRanges();
}

// Ajouter le CSS pour l'animation de surlignage et input
(function() {
  const style = document.createElement('style');
  style.innerHTML = `
    .elevenlabs-animating-selection {
      background: linear-gradient(90deg, #ffe066 0%, #ffd700 50%, #ffe066 100%);
      animation: elevenlabs-pulse 1s infinite alternate;
      border-radius: 4px;
      padding: 0 2px;
      transition: background 0.2s;
    }
    @keyframes elevenlabs-pulse {
      0% { background-color: #ffe066; }
      100% { background-color: #ffd700; }
    }
    .elevenlabs-animating-input {
      animation: elevenlabs-input-pulse 1s infinite alternate !important;
      background: #ffe066 !important;
    }
    @keyframes elevenlabs-input-pulse {
      0% { background-color: #ffe066; }
      100% { background-color: #ffd700; }
    }
  `;
  document.head.appendChild(style);
})();

function resetMicInactivityTimer() {
  // No-op
}

// Initial call to show the mic button on page load
initializeMicroButtonState();

function startMicroButtonDrag(e) {
    if (e.button !== 0) return;

    isDraggingMicroButton = true;
    microButtonWasDragged = false;
    microButton.style.cursor = 'grabbing';

    // If position is defined by bottom/right, switch to top/left for dragging
    const rect = microButton.getBoundingClientRect();
    microButton.style.top = `${rect.top}px`;
    microButton.style.left = `${rect.left}px`;
    microButton.style.bottom = 'auto';
    microButton.style.right = 'auto';
    
    microButtonOffsetX = e.clientX - rect.left;
    microButtonOffsetY = e.clientY - rect.top;

    e.preventDefault();

    document.addEventListener('mousemove', onMicroButtonDragMove);
    document.addEventListener('mouseup', stopMicroButtonDrag, { once: true });
}

function onMicroButtonDragMove(e) {
    if (!isDraggingMicroButton) return;
    microButtonWasDragged = true;
    microButton.style.top = `${e.clientY - microButtonOffsetY}px`;
    microButton.style.left = `${e.clientX - microButtonOffsetX}px`;
}

function stopMicroButtonDrag(e) {
    isDraggingMicroButton = false;
    microButton.style.cursor = 'pointer';
    document.removeEventListener('mousemove', onMicroButtonDragMove);
}

// --- Side Chat UI for Custom Actions ---
let octoChatHistory = [];
let octoChatModel = '';
let octoSideChatActive = false;
let octoChatMessages = [];
let octoChatId = null;
let octoChatSideChatCloser = null; // To hold the closer function

function showSideChat({ prompt, context, model, answer, isNew = true, chatId = null }) {

  if (isNew) {
    octoSideChatActive = true;
    octoChatId = chatId || crypto.randomUUID(); // New chatId for each new chat
  }
  let chatMenu = document.getElementById('octo-side-chat');
  
  const closeSideChat = () => {
    if (chatMenu) {
        chatMenu.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (chatMenu) chatMenu.remove();
            chatMenu = null;
        }, 300);
    }
    octoSideChatActive = false;
    octoChatMessages = [];
    octoChatId = null;
    octoChatSideChatCloser = null;
  };

  if (!chatMenu) {
    octoChatSideChatCloser = closeSideChat;
    chatMenu = document.createElement('div');
    chatMenu.id = 'octo-side-chat';
    chatMenu.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 420px;
      height: 100vh;
      background: #fdfdff;
      box-shadow: -2px 0 16px rgba(0,0,0,0.08);
      border-left: 1px solid #ececec;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      font-family: 'Inter', system-ui, sans-serif;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    `;
    // Header
    const header = document.createElement('div');
    header.textContent = 'Octo Chat';
    header.style.cssText = 'font-size: 1rem; font-weight: 600; padding: 16px 20px 12px 20px; border-bottom: 1px solid #ececec; background: #fafbfc;';
    chatMenu.appendChild(header);
    // Chat area
    const chatArea = document.createElement('div');
    chatArea.id = 'octo-chat-area';
    chatArea.style.cssText = 'flex:1; overflow-y:auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; min-height:0;';
    chatMenu.appendChild(chatArea);
    // Input area
    const inputArea = document.createElement('div');
    inputArea.id = 'octo-chat-input-area';
    inputArea.style.cssText = 'padding: 12px 16px 16px 16px; border-top: 1px solid #ececec; background: #fafbfc; display: flex; gap: 8px; align-items: flex-start;';
    inputArea.innerHTML = `
      <textarea id="octo-chat-user-input" placeholder="Send a message..." style="flex:1; font-size:0.9rem; border-radius:8px; border:1px solid #e3e3e3; padding: 8px 12px; background:#fff; outline:none; resize: none; min-height: 24px; max-height: 120px; line-height: 1.4;"></textarea>
      <button id="octo-chat-send-btn" style="background:#6c63ff;color:#fff;border:none;border-radius:8px;padding:0 16px;font-weight:500;font-size:0.9rem;cursor:pointer; height: 38px;">Send</button>
    `;
    chatMenu.appendChild(inputArea);
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.title = 'Close';
    closeBtn.style.cssText = 'position:absolute;top:10px;right:16px;font-size:1.5rem;background:none;border:none;color:#888;cursor:pointer;z-index:2;';
    closeBtn.onclick = closeSideChat;
    chatMenu.appendChild(closeBtn);
    document.body.appendChild(chatMenu);

    // Bring microButton to front
    if (microButton) {
      document.body.appendChild(microButton);
    }

    const sendButton = inputArea.querySelector('#octo-chat-send-btn');
    const userInput = inputArea.querySelector('#octo-chat-user-input');

    const autoResizeTextarea = () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    };

    const sendMessage = () => {
        sendUserChatMessage(octoChatModel);
        userInput.style.height = 'auto'; // Reset size after sending
    };

    sendButton.onclick = sendMessage;
    userInput.addEventListener('input', autoResizeTextarea);
    userInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
      }
    });

    setTimeout(() => {
        chatMenu.style.transform = 'translateX(0)';
    }, 10);
  }
  const chatArea = document.getElementById('octo-chat-area');

  // Historique : si nouveau, on ajoute, sinon on rerender tout
  if (isNew) {
    octoChatModel = model;
    octoChatHistory = [];
    octoChatMessages = [];
    // Ajoute le message utilisateur (prompt+context concaténés)
    const userMsg = prompt;
    octoChatHistory.push({ role: 'user', content: userMsg, model });
    octoChatMessages.push({ role: 'user', content: userMsg });
  } else if (typeof answer !== 'undefined') {
    // Ajoute la réponse de l'IA SANS toucher au dernier message utilisateur
    octoChatHistory.push({ role: 'assistant', content: answer, model: octoChatModel });
    octoChatMessages.push({ role: 'assistant', content: answer });
  }

  // Rendu de tout l'historique
  chatArea.innerHTML = '';
  octoChatHistory.forEach((msg, idx) => {
    const bubble = document.createElement('div');
    bubble.style.cssText = `
        max-width: 85%;
        border-radius: 12px;
        padding: 10px 14px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        font-size: 14px;
        line-height: 1.4;
        position: relative;
    `;
    if (msg.role === 'user') {
      bubble.style.alignSelf = 'flex-end';
      bubble.style.background = '#e6eaff';
      bubble.style.borderRadius = '12px 12px 4px 12px';
      bubble.innerHTML = `<div style='font-size:0.8em;color:#6c63ff;font-weight:600;margin-bottom:4px;'>Me</div>` +
        `<div style='white-space:pre-wrap; word-break: break-word;'>${escapeHtml(msg.content)}</div>`;
      chatArea.appendChild(bubble);
    } else if (msg.role === 'assistant') {
        bubble.style.alignSelf = 'flex-start';
        bubble.style.background = '#f6f7fb';
        bubble.style.borderRadius = '12px 12px 12px 4px';
        bubble.innerHTML = `<div style='font-size:0.8em;color:#5548c8;font-weight:600;margin-bottom:4px;'>${escapeHtml(msg.model || octoChatModel || 'AI')}</div>` +
        `<div style='white-space:pre-wrap; word-break: break-word;'>${escapeHtml(msg.content)}</div>`;
        chatArea.appendChild(bubble);
    }
  });
  // Ajoute l'animation trois points si attente IA
  if (octoChatHistory.length > 0 && octoChatHistory[octoChatHistory.length - 1].role === 'user' && typeof answer === 'undefined') {
    const aiMsg = document.createElement('div');
    aiMsg.style.cssText = `
        align-self: flex-start;
        max-width: 85%;
        background: #f6f7fb;
        border-radius: 12px 12px 12px 4px;
        padding: 10px 14px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        font-size: 14px;
        position: relative;
    `;
    aiMsg.innerHTML = `<div style='font-size:0.8em;color:#5548c8;font-weight:600;margin-bottom:4px;'>${escapeHtml(octoChatModel || 'AI')}</div>` +
      `<span class='octo-chat-typing'><span></span><span></span><span></span></span>`;
    chatArea.appendChild(aiMsg);
  }
  chatArea.scrollTop = chatArea.scrollHeight;
  // Ajoute l'animation trois points si pas déjà là
  if (!document.getElementById('octo-chat-typing-style')) {
    const style = document.createElement('style');
    style.id = 'octo-chat-typing-style';
    style.innerHTML = `
      .octo-chat-typing {
        display: inline-block;
        min-width: 32px;
        height: 18px;
        vertical-align: middle;
      }
      .octo-chat-typing span {
        display: inline-block;
        width: 8px;
        height: 8px;
        margin: 0 2px;
        background: #bcb8f8;
        border-radius: 50%;
        opacity: 0.7;
        animation: octo-typing-bounce 1.2s infinite both;
      }
      .octo-chat-typing span:nth-child(1) { animation-delay: 0s; }
      .octo-chat-typing span:nth-child(2) { animation-delay: 0.2s; }
      .octo-chat-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes octo-typing-bounce {
        0%, 80%, 100% { transform: scale(0.7); opacity: 0.7; }
        40% { transform: scale(1.2); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

function sendUserChatMessage(model) {
  const input = document.getElementById('octo-chat-user-input');
  const value = input.value.trim();
  if (!value) return;
  // Ajoute le message utilisateur à l'historique et affiche le loader IA
  octoChatHistory.push({ role: 'user', content: value, model });
  octoChatMessages.push({ role: 'user', content: value });
  showSideChat({ isNew: false });
  input.value = '';
  // Envoie la requête à l'API via background avec tout l'historique et le chatId
  chrome.runtime.sendMessage({
    action: 'customAction',
    buttonId: null,
    text: value,
    prompt: value,
    model: model,
    sidechat: true,
    messages: octoChatMessages.slice(),
    chatId: octoChatId
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(tag) {
    const charsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return charsToReplace[tag] || tag;
  });
}

document.addEventListener('mousedown', handleMouseDown); // Capturer les clics

// This function traverses a DOM node, finds all text nodes,
// and wraps each word in a <span>. It returns an array of these spans.
function wrapWordsInSpans(parentNode) {
    const spans = [];
    const walker = document.createTreeWalker(parentNode, NodeFilter.SHOW_TEXT, null, false);
    const nodesToProcess = [];
    while (walker.nextNode()) {
        nodesToProcess.push(walker.currentNode);
    }

    nodesToProcess.forEach(node => {
        if (node.parentNode.nodeName === 'SCRIPT' || node.parentNode.nodeName === 'STYLE') {
            return;
        }
        const words = node.textContent.split(/(\s+)/);
        if (words.every(w => /^\s*$/.test(w))) {
            return;
        }
        
        const fragment = document.createDocumentFragment();
        words.forEach(word => {
            if (/\S/.test(word)) {
                const span = document.createElement('span');
                span.textContent = word;
                span.style.color = 'inherit';
                span.style.transition = 'color 0.2s ease-in-out';
                fragment.appendChild(span);
                spans.push(span);
            } else {
                fragment.appendChild(document.createTextNode(word));
            }
        });
        node.parentNode.replaceChild(fragment, node);
    });
    
    return spans;
}

function updateTtsContent(text, currentTime) {
  if (!ttsContentArea) return;

  // One-time setup when text is first loaded (currentTime is undefined)
  if (currentTime === undefined) {
      ttsContentArea.innerHTML = '';
      ttsWordSpans = []; // Clear old spans
      lastHighlightedWordIndex = -1;

      if (selectedHtmlFragment) {
          ttsContentArea.appendChild(selectedHtmlFragment.cloneNode(true));
      } else {
          const textDiv = document.createElement('div');
          textDiv.style.cssText = 'white-space: pre-wrap; word-break: break-word; width: 100%;';
          textDiv.textContent = text;
          ttsContentArea.appendChild(textDiv);
      }
      // Now that content is in, wrap the words.
      ttsWordSpans = wrapWordsInSpans(ttsContentArea);
      return; // Done with setup
  }

  // --- Highlighting logic for every timeupdate ---

  if (!isTeleprompterEnabled) {
      // If teleprompter is disabled, ensure no words are highlighted
      if (lastHighlightedWordIndex !== -1) {
          ttsWordSpans.forEach(span => {
              if (span.style.color !== 'inherit') {
                  span.style.color = 'inherit';
              }
          });
          lastHighlightedWordIndex = -1;
      }
      return;
  }

  // If teleprompter is enabled, proceed with highlighting
  if (currentAudio && currentAudio.duration > 0 && ttsWordSpans.length > 0 && currentAlignment && currentAlignment.words && currentAlignment.words.length > 0) {
    let currentWordIndex = -1;

    // Find the current word index from alignment data based on current audio time
    for (let i = 0; i < currentAlignment.words.length; i++) {
        if (currentTime >= currentAlignment.words[i].start) {
            currentWordIndex = i;
        } else {
            break; 
        }
    }
    
    if (currentWordIndex === -1) return; 

    // We assume the number of spans matches the number of words in the alignment.
    // This can be brittle if tokenization differs.
    if (ttsWordSpans.length !== currentAlignment.words.length) {
        console.warn(`Word count mismatch between spans (${ttsWordSpans.length}) and alignment (${currentAlignment.words.length}). Highlighting may be off.`);
    }

    if (currentWordIndex !== lastHighlightedWordIndex) {
        
        // Window of words to check for re-styling. It's the union of the old and new "wave" areas.
        const checkStart = Math.min(lastHighlightedWordIndex, currentWordIndex) - 2;
        const checkEnd = Math.max(lastHighlightedWordIndex, currentWordIndex) + 2;

        for (let i = checkStart; i <= checkEnd; i++) {
            if (i < 0 || i >= ttsWordSpans.length) continue; // bounds check

            const span = ttsWordSpans[i];
            const distance = Math.abs(i - currentWordIndex);

            if (distance === 0) {
                span.style.color = '#6c63ff'; // Current word
            } else if (distance === 1) {
                span.style.color = '#9a95e0'; // Adjacent words (faded violet)
            } else {
                 if (span.style.color !== 'inherit') { // Only reset if it's not already the default
                    span.style.color = 'inherit';
                 }
            }
        }

        // Scroll the current word into view
        if (ttsWordSpans[currentWordIndex]) {
            ttsWordSpans[currentWordIndex].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }

        lastHighlightedWordIndex = currentWordIndex;
    }
  }
}

function renderTtsControls() {
    if (!ttsControlsArea) return;
    ttsControlsArea.innerHTML = '';

    // Make the area a flex container to position controls and teleprompter toggle
    ttsControlsArea.style.display = 'flex';
    ttsControlsArea.style.alignItems = 'center';
    ttsControlsArea.style.justifyContent = 'space-between';

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';
    controls.style.gap = '12px';

    // Play/Pause/Loading button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;border:1px solid #6c63ff;background:#6c63ff;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.08);cursor:pointer;transition:background 0.2s;position:relative;';
    playPauseBtn.title = toolbarState === 'playing' ? 'Pause' : 'Play';

    if (toolbarState === 'loading') {
        playPauseBtn.innerHTML = `<span style="display:inline-block;width:22px;height:22px;border:3px solid #fff;border-top:3px solid rgba(255,255,255,0.5);border-radius:50%;animation:spinBtn 1s linear infinite;"></span>`;
        playPauseBtn.disabled = true;
    } else if (toolbarState === 'playing') {
        playPauseBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
        playPauseBtn.onclick = () => { if (currentAudio) currentAudio.pause(); };
    } else {
        playPauseBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        playPauseBtn.onclick = () => {
            if (currentAudio) {
                if (currentAudio.ended) {
                    currentAudio.currentTime = 0;
                }
                currentAudio.play().catch(e => console.error("Audio playback failed:", e));
            } else if (selectedText) {
                toolbarState = 'loading';
                renderTtsControls();
                chrome.runtime.sendMessage({ action: 'convertToSpeech', text: selectedText });
            }
        };
    }
    controls.appendChild(playPauseBtn);

    // Repeat button
    const repeatBtn = document.createElement('button');
    repeatBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;border:1px solid #e5e7eb;background:#fff;color:#222;box-shadow:0 1px 4px rgba(0,0,0,0.06);cursor:pointer;transition:background 0.2s;';
    repeatBtn.title = 'Restart';
    repeatBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>';
    repeatBtn.onclick = () => {
        if (currentAudio) {
            currentAudio.currentTime = 0;
            currentAudio.play();
        } else if (selectedText) {
            chrome.runtime.sendMessage({ action: 'convertToSpeech', text: selectedText });
        }
    };
    controls.appendChild(repeatBtn);

    // Speed controls
    const speedControl = document.createElement('span');
    speedControl.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:0.95em;color:#888; background: #fff; border: 1px solid #e5e7eb; border-radius: 9999px; padding: 4px 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);';
    const speedMinus = document.createElement('button');
    speedMinus.textContent = '–';
    speedMinus.style.cssText = 'background:none;border:none;color:#555;font-size:1.2em;cursor:pointer;padding:0 4px;';
    speedMinus.onclick = () => {
        if (currentPlaybackRate > 0.76) {
            currentPlaybackRate = Math.max(0.75, +(currentPlaybackRate - 0.25).toFixed(2));
            if (currentAudio) currentAudio.playbackRate = currentPlaybackRate;
            renderTtsControls();
        }
    };
    const speedPlus = document.createElement('button');
    speedPlus.textContent = '+';
    speedPlus.style.cssText = 'background:none;border:none;color:#555;font-size:1.2em;cursor:pointer;padding:0 4px;';
    speedPlus.onclick = () => {
        if (currentPlaybackRate < 1.99) {
            currentPlaybackRate = Math.min(2.0, +(currentPlaybackRate + 0.25).toFixed(2));
            if (currentAudio) currentAudio.playbackRate = currentPlaybackRate;
            renderTtsControls();
        }
    };
    const speedValue = document.createElement('span');
    speedValue.textContent = currentPlaybackRate.toFixed(2).replace(/\.00$/, '') + 'x';
    speedValue.style.cssText = 'min-width:40px;text-align:center;color:#333;font-weight:500;';
    
    speedControl.appendChild(speedMinus);
    speedControl.appendChild(speedValue);
    speedControl.appendChild(speedPlus);
    controls.appendChild(speedControl);
    
    ttsControlsArea.appendChild(controls);

    const teleprompterControls = document.createElement('div');
    teleprompterControls.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    `;

    const teleprompterIcon = document.createElement('div');
    teleprompterIcon.title = 'Toggle Teleprompter';
    teleprompterIcon.style.cssText = 'display: flex; align-items: center; justify-content: center; color: #555;';
    teleprompterIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 8 9"></polyline></svg>`;
    teleprompterControls.appendChild(teleprompterIcon);

    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'el-switch';
    toggleSwitch.innerHTML = `
        <input type="checkbox" ${isTeleprompterEnabled ? 'checked' : ''}>
        <span class="el-slider"></span>
    `;
    toggleSwitch.querySelector('input').onchange = (e) => {
        isTeleprompterEnabled = e.target.checked;
        renderTtsControls();
        if (currentAudio) {
            updateTtsContent(selectedText, currentAudio.currentTime);
        }
    };
    teleprompterControls.appendChild(toggleSwitch);
    ttsControlsArea.appendChild(teleprompterControls);

    if (!document.getElementById('el-toolbar-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'el-toolbar-spinner-style';
        style.innerHTML = `@keyframes spinBtn{to{transform:rotate(360deg)}}`;
        document.head.appendChild(style);
    }

    if (!document.getElementById('el-switch-style')) {
      const style = document.createElement('style');
      style.id = 'el-switch-style';
      style.innerHTML = `
        .el-switch { position: relative; display: inline-block; width: 34px; height: 20px; }
        .el-switch input { opacity: 0; width: 0; height: 0; }
        .el-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
        .el-slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .el-slider { background-color: #6c63ff; }
        input:checked + .el-slider:before { transform: translateX(14px); }
      `;
      document.head.appendChild(style);
    }
}

function showTtsSidebar() {
  const closeSidebar = () => {
      if (ttsSidebar) {
          ttsSidebar.style.transform = 'translateX(100%)';
          setTimeout(() => {
              if (ttsSidebar) ttsSidebar.remove();
              ttsSidebar = null;
              ttsContentArea = null;
              ttsControlsArea = null;
              ttsSidebarCloser = null;
          }, 300);
      }
      if (currentAudio) {
        currentAudio.pause();
      }
      toolbarState = 'idle';
  };

  if (ttsSidebar) {
      ttsSidebar.style.transform = 'translateX(0)';
      updateTtsContent(selectedText);
      renderTtsControls();
      return;
  }

  ttsSidebarCloser = closeSidebar;

  ttsSidebar = document.createElement('div');
  ttsSidebar.id = 'octo-tts-sidebar';
  ttsSidebar.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 420px;
    height: 100vh;
    background: #fdfdff;
    box-shadow: -2px 0 16px rgba(0,0,0,0.08);
    border-left: 1px solid #ececec;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    font-family: 'Inter', system-ui, sans-serif;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'font-size: 1rem; font-weight: 600; padding: 16px 20px 12px 20px; border-bottom: 1px solid #ececec; background: #fafbfc; color: #111; display: flex; align-items: center; gap: 8px;';
  header.innerHTML = `<span>Octo read</span>`;
  ttsSidebar.appendChild(header);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.title = 'Close';
  closeBtn.style.cssText = 'position:absolute;top:10px;right:16px;font-size:1.5rem;background:none;border:none;color:#888;cursor:pointer;z-index:2;';
  closeBtn.onclick = closeSidebar;
  ttsSidebar.appendChild(closeBtn);

  ttsContentArea = document.createElement('div');
  ttsContentArea.id = 'octo-tts-content-area';
  ttsContentArea.style.cssText = 'flex:1; overflow-y:auto; padding: 20px; color: #111; font-size: 16px; line-height: 1.6; min-height:0;';
  ttsSidebar.appendChild(ttsContentArea);
  
  ttsControlsArea = document.createElement('div');
  ttsControlsArea.id = 'octo-tts-controls-area';
  ttsControlsArea.style.cssText = 'padding: 12px 16px 16px 16px; border-top: 1px solid #ececec; background: #fafbfc;';
  ttsSidebar.appendChild(ttsControlsArea);

  document.body.appendChild(ttsSidebar);

  setTimeout(() => {
    ttsSidebar.style.transform = 'translateX(0)';
  }, 10);
  
  updateTtsContent(selectedText);
  renderTtsControls();
}

// Suivre le dernier champ de saisie actif pour une insertion de texte fiable
document.addEventListener('focusin', (e) => {
    if (isEditableElement(e.target)) {
        lastActiveEditableElementForInsertion = e.target;
    }
});

function findEditableParent(element) {
    let current = element;
    while(current) {
        if (isEditableElement(current)) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
}

function insertTextInPage(text, fromCorrection = false) {
    let activeElement = document.activeElement;
    let targetElement = findEditableParent(activeElement);

    // If the currently active element isn't editable, fall back to the last one we saw.
    if (!targetElement) {
        targetElement = lastActiveEditableElementForInsertion;
    }
    
    // Final check to ensure the fallback element is still valid and in the DOM
    if (!targetElement || !document.body.contains(targetElement) || !isEditableElement(targetElement)) {
        copyToClipboard(text);
        showCopyConfirmation("Copied to clipboard (no active input)");
        if (fromCorrection) {
            hideCorrectionLabel();
        }
        return false;
    }
    
    targetElement.focus();

    if (targetElement.tagName.toLowerCase() === 'input' || targetElement.tagName.toLowerCase() === 'textarea') {
        insertInInputElement(targetElement, text);
    } else if (targetElement.isContentEditable) {
        insertInContentEditable(targetElement, text);
    }

    if (fromCorrection) {
        showCorrectionLabel("Text inserted and copied");
    } else {
        playNotificationSound(); // This already shows a confirmation
    }
    return true;
}

function insertInInputElement(element, text) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const currentValue = element.value;

    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
    element.value = newValue;

    const newCursorPosition = start + text.length;
    element.setSelectionRange(newCursorPosition, newCursorPosition);

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.focus();
}

function insertInContentEditable(element, text) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);

        // Make sure the range is within our target editable element
        if (!element.contains(range.commonAncestorContainer)) {
             // If selection is outside, create a new range at the end of the element
             range = document.createRange();
             range.selectNodeContents(element);
             range.collapse(false); // collapse to the end
        }
        
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);

        // Move cursor after the inserted text
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        // If no selection, append to the end
        element.appendChild(document.createTextNode(text));
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.focus();
}

function showOctoButton() {
  // Create container and button if they don't exist
  if (!octoContainer) {
    octoContainer = document.createElement('div');
    octoContainer.id = 'octo-container';
    octoContainer.style.cssText = `
      position: fixed;
      bottom: 165px;
      right: 25px;
      width: 65px;
      height: 65px;
      z-index: 2147483646;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    `;
    document.body.appendChild(octoContainer);

    octoButton = document.createElement('button');
    octoButton.id = 'octo-action-button';
    
    // New Octo Logo
    octoButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 369 335" style="width: 45px; height: 45px; fill: #222;"><path d="M176 48.6a67 67 0 0 0-34.8 21.6 75 75 0 0 0-11.6 23.5 85 85 0 0 0-1.6 19.9v13.9l9.9 5.7c5.5 3.2 10.2 5.8 10.5 5.8s.6-7.8.6-17.3c.1-18.2.7-22.9 4.2-30.5 3-6.4 12.5-15.7 19-18.7a41 41 0 0 1 54.1 19.4l3.2 6.6.6 43c.3 25.9.9 44.2 1.6 46 7.1 20.4 26.6 32.9 46.2 29.5a42 42 0 0 0 33.6-28.8 45 45 0 0 0-2.1-29.3 39 39 0 0 0-38.5-23.7l-8.4.3-.3 11.4c-.2 10.5-.1 11.3 1.5 10.6a23 23 0 0 1 20.6 2.9c3.5 2.6 7.7 11 7.7 15.5 0 2-1.1 5.9-2.4 8.8-7 15-28.9 15-35.7-.2-1.7-3.6-1.9-7.3-1.9-41.5-.1-43.4-.7-48.5-6.9-61.5A62 62 0 0 0 176 48.6m-6 53.1c-.8.3-2.7 1.7-4.2 3.1-5.5 5.1-2.8 14.9 4.6 16.8a10 10 0 0 0 9.9-16.6c-2.8-3-7.4-4.5-10.3-3.3m32.4.3c-3.4 1.3-6.4 5.9-6.4 9.7 0 2.7.8 4.3 3.5 7 3.2 3.2 4 3.5 7.6 3 4.8-.6 7.4-2.8 8.9-7.2 2.7-8-5.7-15.7-13.6-12.5M92.3 136.9A41 41 0 0 0 68.6 159a45 45 0 0 0-2.1 29.2 41.6 41.6 0 0 0 76.7 6.4c1.6-3.2 2.7-6.4 2.4-7.1-.4-1.2-17.5-11-18-10.3l-2.1 5.3a21 21 0 0 1-14.1 13.4A20 20 0 0 1 86 176.2c0-6.6 1.3-9.9 5.8-14.5 4.3-4.4 11.7-7 17.2-6.1 4.4.8 19.9 8.9 35.8 18.8L157 182l10.6-5.6c5.8-3.1 10.2-6 9.7-6.5s-4.6-3.2-9.3-6c-43.3-26.7-46.3-28.1-60.5-28.6-7.9-.2-11.1.1-15.2 1.6m125.2 22.5L198 170c-31.4 16.6-40.1 23.4-46.2 35.8-3.1 6.3-3.3 7.2-3.3 17.7s.2 11.4 3.3 17.8a41.4 41.4 0 1 0 69.5-44l-2.8-3.2-9.3 5.6-9.2 5.6 3.9 4.2c7.8 8.4 8 19.2.5 27.5a20.2 20.2 0 0 1-35.4-13.5c0-11.5 4.2-15.7 29.2-29.4l18.6-10.3 3.2-2v-11.9c0-6.5-.1-11.9-.3-11.9z"/></svg>`;

    octoButton.addEventListener('mousedown', startOctoButtonDrag);
    octoButton.addEventListener('mouseenter', showOctoMenu);
    octoButton.addEventListener('mouseleave', scheduleHideOctoMenu);

    octoContainer.appendChild(octoButton);

    octoActionBubblesContainer = document.createElement('div');
    octoActionBubblesContainer.id = 'octo-action-bubbles-container';
    octoActionBubblesContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    `;
    octoContainer.appendChild(octoActionBubblesContainer);
  }

  // Make it visible and ready for fade-in
  octoContainer.style.display = 'block';
  octoContainer.style.visibility = 'visible';

  // Use a small timeout to trigger the fade-in animation
  setTimeout(() => {
    if (octoContainer) {
      octoContainer.style.opacity = '1';
      octoContainer.style.pointerEvents = 'auto';
    }
  }, 10);
}

function hideOctoButton() {
  if (octoContainer) {
    // Start the fade-out
    octoContainer.style.opacity = '0';
    octoContainer.style.pointerEvents = 'none';

    // Wait for the transition to finish before hiding it completely
    setTimeout(() => {
      if (octoContainer) {
        octoContainer.style.display = 'none';
        octoContainer.style.visibility = 'hidden';
      }
    }, 200); // This should match the CSS transition duration
  }
}

function toggleOctoMenu() {
    isOctoMenuOpen = !isOctoMenuOpen;

    if (isOctoMenuOpen) {
        octoButton.classList.add('bump');
        setTimeout(() => {
            octoButton.classList.remove('bump');
        }, 300);

        octoContainer.classList.add('gooey-effect');
        showActionBubbles();
    } else {
        octoContainer.classList.remove('gooey-effect');
        hideActionBubbles();
    }
}

// Detect if Octo button is near the right edge of the screen
function isButtonNearRightEdge() {
    if (!octoContainer) return false;
    
    const buttonRect = octoContainer.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const distanceFromRightEdge = viewportWidth - buttonRect.right;
    
    // Consider "near right edge" if within 150px of the edge
    return distanceFromRightEdge < 150;
}

function showActionBubbles() {
    chrome.storage.sync.get(['actionButtonsSettings', 'isMicroButtonVisible', 'isReadButtonVisible'], (result) => {
        let allActions = [];

        if (result.isMicroButtonVisible !== false) {
            allActions.push({ id: 'micro', title: 'Dictate' });
        }
        if (result.isReadButtonVisible !== false) {
            allActions.push({ id: 'read', title: 'Read selection' });
        }
        
        const customActions = (result.actionButtonsSettings || []).filter(b => b.title);
        allActions = allActions.concat(customActions);

        if (allActions.length === 0) {
            // Jiggle animation to indicate no actions are set
            octoButton.classList.add('jiggle');
            setTimeout(() => {
                octoButton.classList.remove('jiggle');
            }, 500);
            
            // Close the menu automatically
            toggleOctoMenu();
            return;
        }

        const capturedText = selectedText;
        octoActionBubblesContainer.innerHTML = '';
        const bubbleCount = allActions.length;
        const angleStep = Math.PI / (bubbleCount + 1);
        const radius = 75;
        
        // Check if button is near right edge to determine bubble placement
        const nearRightEdge = isButtonNearRightEdge();
        console.log(`[Octo Bubbles] Layout mode: ${nearRightEdge ? 'COLUMN (left-side)' : 'SEMICIRCLE'} | Bubble count: ${bubbleCount}`);
        
        // Add visual feedback by adjusting container class
        if (nearRightEdge) {
            octoContainer.classList.add('near-right-edge');
        } else {
            octoContainer.classList.remove('near-right-edge');
        }

        allActions.forEach((btn, index) => {
            const angle = (index + 1) * angleStep;
            const bubble = document.createElement('button');
            bubble.className = 'octo-action-bubble';
            bubble.title = btn.title;
            
            bubble.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 42px;
                height: 42px;
                border-radius: 50%;
                background: #fff;
                color: #111;
                border: 1px solid #e5e7eb;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                transform: translate(-50%, -50%) scale(1);
                transition: transform 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);
                pointer-events: all;
            `;
            
            if (btn.id === 'micro' || btn.id === 'read') {
                bubble.innerHTML = ACTION_ICONS[btn.id];
            } else {
                const label = btn.title || btn.id || 'A';
                bubble.innerHTML = `<span>${label.charAt(0).toUpperCase()}</span>`;
            }
            
            // Calculate bubble position based on edge proximity
            let x, y;
            
            if (nearRightEdge) {
                // Vertical column layout for better left-side utilization
                const leftOffset = -80; // Fixed left offset from center
                
                // Calculate spacing based on available screen height and bubble count
                const buttonRect = octoContainer.getBoundingClientRect();
                const availableHeight = Math.min(window.innerHeight - 200, 400); // Max height considering margins
                const maxSpacing = availableHeight / Math.max(bubbleCount - 1, 1);
                const verticalSpacing = Math.max(45, Math.min(maxSpacing, 75)); // Responsive spacing
                
                const totalHeight = (bubbleCount - 1) * verticalSpacing;
                const startY = -totalHeight / 2; // Center the column vertically
                
                x = leftOffset;
                y = startY + (index * verticalSpacing);
                
                console.log(`Bubble ${index}: Column layout - x: ${x}, y: ${y}, spacing: ${verticalSpacing.toFixed(1)}`);
            } else {
                // Standard semicircle layout
                const baseX = radius * Math.cos(angle);
                const baseY = radius * Math.sin(angle);
                
                x = baseX;
                y = baseY;
                
                console.log(`Bubble ${index}: Semicircle layout - x: ${x}, y: ${y}, angle: ${angle}`);
            }
            
            bubble.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                switch (btn.id) {
                    case 'micro':
                        triggerRecording();
                        break;
                    case 'read':
                        handleReadText(capturedText);
                        break;
                    default:
                        handleCustomAction(btn.id, capturedText);
                        break;
                }

                hideOctoMenu();
            };

            bubble.addEventListener('mouseenter', showOctoMenu);
            bubble.addEventListener('mouseleave', scheduleHideOctoMenu);
            
            octoActionBubblesContainer.appendChild(bubble);

            setTimeout(() => {
                bubble.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1)`;
                bubble.style.transition = 'transform 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
            }, 50);
        });
    });
}

function hideActionBubbles() {
    if (!octoActionBubblesContainer) return;
    const bubbles = Array.from(octoActionBubblesContainer.querySelectorAll('.octo-action-bubble'));
    bubbles.forEach((bubble, index) => {
        setTimeout(() => {
            bubble.style.transform = 'translate(-50%, -50%) scale(1)';
            bubble.style.transition = 'transform 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        }, 50 * index);
    });
    setTimeout(() => {
        if(octoActionBubblesContainer) {
            octoActionBubblesContainer.innerHTML = '';
        }
    }, 50 * bubbles.length + 800);
}

function startOctoButtonDrag(e) {
    if (e.button !== 0) return;

    isDraggingOctoButton = true;
    octoButtonWasDragged = false;
    octoButton.style.cursor = 'grabbing';

    const rect = octoContainer.getBoundingClientRect();
    octoContainer.style.top = `${rect.top}px`;
    octoContainer.style.left = `${rect.left}px`;
    octoContainer.style.bottom = 'auto';
    octoContainer.style.right = 'auto';
    
    octoButtonOffsetX = e.clientX - rect.left;
    octoButtonOffsetY = e.clientY - rect.top;

    e.preventDefault();

    document.addEventListener('mousemove', onOctoButtonDragMove);
    document.addEventListener('mouseup', stopOctoButtonDrag, { once: true });
}

function onOctoButtonDragMove(e) {
    if (!isDraggingOctoButton) return;
    octoButtonWasDragged = true;
    octoContainer.style.top = `${e.clientY - octoButtonOffsetY}px`;
    octoContainer.style.left = `${e.clientX - octoButtonOffsetX}px`;
}

function stopOctoButtonDrag() {
    isDraggingOctoButton = false;
    octoButton.style.cursor = 'pointer';
    document.removeEventListener('mousemove', onOctoButtonDragMove);
}