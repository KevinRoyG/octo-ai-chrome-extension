// Background service worker
console.log('Speed Reader AI Background script loaded');

// Import API utilities
importScripts('../utils/api.js');

// Best voices by language
const BEST_VOICES = {
  'en': 'af_heart',      // American English - Grade A
  'fr': 'ff_siwis',     // French - Grade B-
  'ja': 'jf_alpha',     // Japanese - Grade C+
  'zh': 'zf_xiaobei',   // Mandarin Chinese - Grade C
  'es': 'ef_dora',      // Spanish
  'hi': 'hf_alpha',     // Hindi - Grade C
  'it': 'if_sara',      // Italian - Grade C
  'pt': 'pf_dora'       // Brazilian Portuguese
};

// Simple language detection based on common patterns
function detectLanguage(text) {
  console.log('Detecting language for text:', text.substring(0, 50) + '...');
  
  // Language patterns
  const languagePatterns = {
    fr: [
      // Articles et déterminants
      /\b(le|la|les|un|une|des|du|de|des|ce|cette|ces|mon|ton|son|notre|votre|leur)\b/i,
      // Pronoms
      /\b(je|tu|il|elle|nous|vous|ils|elles|me|te|se|le|la|les|lui|leur|y|en)\b/i,
      // Verbes courants
      /\b(être|avoir|faire|aller|venir|voir|dire|penser|vouloir|pouvoir|devoir|savoir|prendre|donner|mettre)\b/i,
      // Mots de liaison
      /\b(et|ou|mais|donc|car|ni|que|qui|quoi|où|quand|comment|pourquoi)\b/i,
      // Caractères spéciaux
      /[éèêëàâçîïôöûüù]/i,
      // Expressions typiques
      /\b(est-ce que|n'est-ce pas|qu'est-ce que|voilà|voici)\b/i
    ],
    es: [
      // Articles et déterminants
      /\b(el|la|los|las|un|una|unos|unas|este|esta|estos|estas|ese|esa|esos|esas|mi|tu|su|nuestro|vuestro)\b/i,
      // Pronoms
      /\b(yo|tú|él|ella|nosotros|vosotros|ellos|ellas|me|te|se|lo|la|los|las|le|les|nos|os)\b/i,
      // Verbes courants
      /\b(ser|estar|tener|hacer|ir|venir|ver|decir|pensar|querer|poder|deber|saber|tomar|dar|poner)\b/i,
      // Mots de liaison
      /\b(y|o|pero|porque|pues|que|cual|quien|donde|cuando|como|por qué)\b/i,
      // Caractères spéciaux
      /[áéíóúñ¿¡]/i,
      // Expressions typiques
      /\b(¿qué tal|¿cómo estás|buenos días|buenas noches|por favor|gracias)\b/i
    ],
    it: [
      // Articles et déterminants
      /\b(il|lo|la|i|gli|le|un|uno|una|un'|questo|questa|questi|queste|quello|quella|quelli|quelle|mio|tuo|suo)\b/i,
      // Pronoms
      /\b(io|tu|lui|lei|noi|voi|loro|mi|ti|si|lo|la|li|le|gli|ci|vi)\b/i,
      // Verbes courants
      /\b(essere|avere|fare|andare|venire|vedere|dire|pensare|volere|potere|dovere|sapere|prendere|dare|mettere)\b/i,
      // Mots de liaison
      /\b(e|o|ma|perché|dunque|che|cui|chi|dove|quando|come|perché)\b/i,
      // Caractères spéciaux
      /[àèéìíîòóùú]/i,
      // Expressions typiques
      /\b(come stai|buongiorno|buonasera|per favore|grazie|prego)\b/i
    ],
    pt: [
      // Articles et déterminants
      /\b(o|a|os|as|um|uma|uns|umas|este|esta|estes|estas|esse|essa|esses|essas|meu|teu|seu|nosso|vosso)\b/i,
      // Pronoms
      /\b(eu|tu|ele|ela|nós|vós|eles|elas|me|te|se|o|a|os|as|lhe|lhes|nos|vos)\b/i,
      // Verbes courants
      /\b(ser|estar|ter|fazer|ir|vir|ver|dizer|pensar|querer|poder|dever|saber|tomar|dar|pôr)\b/i,
      // Mots de liaison
      /\b(e|ou|mas|porque|pois|que|qual|quem|onde|quando|como|por que)\b/i,
      // Caractères spéciaux
      /[áàâãéêíóôõúüç]/i,
      // Expressions typiques
      /\b(como vai|bom dia|boa noite|por favor|obrigado|obrigada)\b/i
    ],
    ja: [
      // Caractères
      /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/i,
      // Particules
      /\b(は|が|を|に|へ|で|と|から|まで|の|も|や|か|ね|よ|な|わ)\b/i,
      // Formes verbales
      /\b(です|ます|でした|ました|です|ます|です|ます|だ|である|です|ます)\b/i,
      // Expressions courantes
      /\b(こんにちは|さようなら|ありがとう|すみません|お願いします)\b/i
    ],
    zh: [
      // Caractères
      /[\u4E00-\u9FFF]/i,
      // Mots courants
      /\b(的|是|在|了|和|有|我|你|他|她|它|们|这|那|什么|谁|哪里|什么时候|怎么|为什么)\b/i,
      // Particules
      /\b(不|也|就|都|还|又|很|太|真|好|吗|呢|吧|啊|呀|哦|啦|嘛)\b/i,
      // Expressions courantes
      /\b(你好|再见|谢谢|对不起|请|没关系|不用谢)\b/i
    ],
    hi: [
      // Pronoms
      /\b(मैं|तुम|वह|हम|आप|वे|यह|ये|उस|इस|मुझे|तुम्हें|उसे|हमें|आपको|उन्हें)\b/i,
      // Verbes
      /\b(है|हैं|था|थे|थी|थीं|होगा|होंगे|होगी|होंगी|करना|जाना|आना|देखना|कहना|सोचना)\b/i,
      // Postpositions
      /\b(का|के|की|को|से|में|पर|तक|साथ|बिना|के लिए|के बारे में|के साथ|के बाद|के पहले)\b/i,
      // Expressions courantes
      /\b(नमस्ते|धन्यवाद|कृपया|माफ़ कीजिए|स्वागत है|शुभ रात्रि)\b/i
    ],
    en: [
      // Articles and determiners
      /\b(the|a|an|this|that|these|those|my|your|his|her|its|our|their)\b/i,
      // Pronouns
      /\b(i|you|he|she|it|we|they|me|him|her|us|them|my|your|his|her|its|our|their)\b/i,
      // Common verbs
      /\b(is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|shall|should|may|might|must)\b/i,
      // Prepositions and conjunctions
      /\b(in|on|at|to|for|with|by|from|of|about|as|and|or|but|if|because|while|when|where|how|why)\b/i,
      // Common expressions
      /\b(hello|goodbye|thank you|please|sorry|excuse me|how are you|good morning|good night)\b/i
    ]
  };
  
  // Count patterns for each language
  const scores = {};
  for (const [lang, patterns] of Object.entries(languagePatterns)) {
    scores[lang] = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[lang]++;
        console.log(`${lang} pattern matched:`, pattern);
      }
    }
  }
  
  console.log('Language scores:', scores);
  
  // Find the language with the highest score
  let maxScore = 0;
  let detectedLang = 'en'; // Default to English
  
  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang;
    }
  }
  
  // Only return a language if it has at least 3 matches
  // This makes the detection more strict
  if (maxScore >= 3) {
    console.log('Detected as:', detectedLang, 'with score:', maxScore);
    return detectedLang;
  }
  
  // Default to English if no language has enough matches
  console.log('No strong language match, defaulting to English');
  return 'en';
}

// Create context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'readSelectedText',
    title: 'Read with Speed Reader AI',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'readSelectedText') {
    // Send message to content script to handle the selected text
    chrome.tabs.sendMessage(tab.id, {
      action: 'readContextMenuText',
      text: info.selectionText
    });
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'convertToSpeech') {
    handleTextToSpeech(request.text, sender.tab?.id);
  }
  
  if (request.action === 'textSelected') {
    // Forward to popup if it's open
    chrome.runtime.sendMessage(request).catch(() => {
      // Popup not open, ignore
    });
  }

  if (request.action === 'openSettings') {
    chrome.runtime.openOptionsPage();
  }

  // Ajout : gestion de la correction grammaticale
  if (request.action === 'correctGrammar') {
    handleGrammarCorrection(request.text, sender.tab?.id);
  }

  // --- Generic custom action for all action menu buttons ---
  if (request.action === 'customAction') {
    handleCustomAction(request, sender.tab?.id);
  }

  // Ouvre le popup de l'extension comme si on cliquait sur l'icône
  if (request.action === 'openExtensionPopup') {
    if (chrome.action && chrome.action.openPopup) {
      chrome.action.openPopup();
    } else {
      // Fallback: ouvrir le popup.html dans une petite fenêtre
      const popupUrl = chrome.runtime.getURL('popup/popup.html');
      chrome.windows.create({
        url: popupUrl,
        type: 'popup',
        width: 420,
        height: 520
      });
    }
  }
});

// Fonction utilitaire pour obtenir la clé API DeepInfra (legacy support)
async function getDeepInfraApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['deepinfraApiKey'], function(result) {
      resolve(result.deepinfraApiKey || '');
    });
  });
}

// Fonction utilitaire pour obtenir la clé API OpenRouter
async function getOpenRouterApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openrouterApiKey'], function(result) {
      resolve(result.openrouterApiKey || '');
    });
  });
}

// Handle text-to-speech conversion
async function handleTextToSpeech(text, tabId) {
  try {
    // Get settings from storage
    const result = await chrome.storage.sync.get(['speakingRate']);
    
    // Use default values if settings are not set
    const speakingRate = result.speakingRate || 1.25;
    
    // Detect language of the text
    const language = detectLanguage(text);
    console.log('Text sample:', text.substring(0, 50) + '...');
    console.log('Detected language:', language);
    
    // Get the appropriate voice for the detected language
    const voiceId = BEST_VOICES[language];
    console.log('Available voices:', BEST_VOICES);
    console.log('Selected voice ID:', voiceId);
    
    if (!voiceId) {
      console.error('No voice found for language:', language);
      throw new Error(`No voice available for language: ${language}`);
    }
    
    // DeepInfra API call
    console.log('Making DeepInfra API call with voice:', voiceId);
    const requestBody = {
      text: text,
      output_format: 'wav',
      speed: speakingRate,
      return_timestamps: true,
      preset_voice: [voiceId]
    };
    console.log('Request body:', requestBody);

    // Récupérer la clé API utilisateur
    const apiKey = await getDeepInfraApiKey();
    if (!apiKey) throw new Error('Aucune clé API DeepInfra trouvée. Veuillez la renseigner dans le popup.');
    const response = await fetch('https://api.deepinfra.com/v1/inference/hexgrad/Kokoro-82M', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepInfra API error:', errorText);
      throw new Error(`DeepInfra API request failed with status ${response.status}: ${errorText}`);
    }

    // Log response headers
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Get response as text first to inspect it
    const responseText = await response.text();
    console.log('Raw response text:', responseText.substring(0, 200) + '...');
    
    // Parse the response as JSON
    const deepInfraResponse = JSON.parse(responseText);
    
    // Log detailed response information
    console.log('DeepInfra response keys:', Object.keys(deepInfraResponse));
    console.log('DeepInfra audio type:', typeof deepInfraResponse.audio);
    console.log('DeepInfra audio length:', deepInfraResponse.audio?.length);
    console.log('DeepInfra audio preview:', deepInfraResponse.audio?.substring(0, 50) + '...');
    console.log('DeepInfra words:', deepInfraResponse.words);
    console.log('DeepInfra status:', deepInfraResponse.inference_status);

    // Check if the response has the required data
    if (!deepInfraResponse.audio) {
      console.error('Missing audio data in response:', deepInfraResponse);
      throw new Error('No audio data received from DeepInfra API');
    }

    // Validate alignment data but don't throw error if missing
    if (!deepInfraResponse.words || !Array.isArray(deepInfraResponse.words) || deepInfraResponse.words.length === 0) {
      console.warn('No word alignment data received, will use estimated alignment');
    } else {
      // Validate each word has required properties
      const invalidWords = deepInfraResponse.words.filter(word => 
        !word.text || typeof word.start !== 'number' || typeof word.end !== 'number'
      );
      if (invalidWords.length > 0) {
        console.warn('Invalid word data found, will use estimated alignment:', invalidWords);
      }
    }

    // Check if audio is a data URL and handle it
    let audioData = deepInfraResponse.audio;
    const isDataURL = typeof audioData === 'string' && audioData.startsWith('data:audio');
    console.log('Is audio a data URL:', isDataURL);

    if (!isDataURL) {
      if (typeof audioData === 'string' && audioData.startsWith('http')) {
        try {
          console.log('Fetching audio from URL:', audioData);
          const audioResponse = await fetch(audioData);
          const audioBlob = await audioResponse.blob();
          audioData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
          });
        } catch (error) {
          console.error('Error fetching audio from URL:', error);
          throw new Error('Failed to process audio data from URL');
        }
      } else {
        console.error('Unrecognized audio data format');
        throw new Error('Unrecognized audio data format');
      }
    }

    // Fix for malformed base64 prefix from API (e.g., "data:...,//...")
    const parts = audioData.split(',');
    if (parts.length === 2 && parts[1].startsWith('//')) {
        parts[1] = parts[1].substring(2);
        audioData = parts.join(',');
    }

    // Send audio and timestamps directly to content script
    chrome.tabs.sendMessage(tabId, {
      action: 'playAudioWithTimestamps',
      audioBuffer: audioData,
      alignment: deepInfraResponse.words,
      normalizedAlignment: deepInfraResponse.words,
      status: deepInfraResponse.inference_status
    });

  } catch (error) {
    console.error('Error in text-to-speech conversion:', error);
    chrome.tabs.sendMessage(tabId, {
      action: 'showError',
      message: 'Error converting text to speech: ' + error.message
    });
  }
}

// Nouvelle fonction pour gérer la correction grammaticale
async function handleGrammarCorrection(text, tabId) {
  try {
    const prompt = "Correct the spelling and grammar mistakes if there is some in this text and send back only the corrected or the same text if there is no mistakes. Here is the text to correct :\n" + text;
    const model = "google/gemini-2.0-flash-001";
    const messages = [{ role: "user", content: prompt }];
    
    console.log('[SpeedReader] Prompt envoyé:', prompt);
    console.log('[SpeedReader] Model utilisé:', model);
    
    // Use the new API routing system
    const data = await makeApiRequest(model, messages);
    console.log('[SpeedReader] Réponse API:', data);
    
    const corrected = extractResponseText(data);
    if (!corrected) {
      console.warn("[SpeedReader] Pas de texte corrigé trouvé dans la réponse:", data);
    }
    
    console.log('[SpeedReader] Envoi à tabId', tabId, 'texte:', corrected);
    chrome.tabs.sendMessage(tabId, {
      action: "grammarCorrected",
      correctedText: corrected,
      sidechat: false,
      prompt: prompt,
      model: model
    });
  } catch (error) {
    console.error("Error in grammar correction:", error);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: "grammarCorrected",
        correctedText: "",
        sidechat: false
      });
    }
  }
}

// --- Generic handler for custom action buttons ---
async function handleCustomAction(request, tabId) {
  try {
    const prompt = request.prompt;
    const model = request.model;
    const sidechat = !!request.sidechat;
    const chatId = request.chatId;
    
    // If messages array is present, use it for conversation context
    const messages = Array.isArray(request.messages) && request.messages.length > 0
      ? request.messages
      : [ { role: "user", content: prompt } ];

    console.log('[SpeedReader] Custom action - Model:', model);
    console.log('[SpeedReader] Custom action - Provider:', getApiProvider(model));
    
    // Use the new API routing system
    const data = await makeApiRequest(model, messages, chatId);
    console.log('[SpeedReader] Raw API response:', data);
    
    const resultText = extractResponseText(data);
    if (!resultText) {
      console.warn("[SpeedReader] No result text found in response:", data);
    }
    
    console.log('[SpeedReader] Sending to tabId', tabId, 'text:', resultText);
    chrome.tabs.sendMessage(tabId, {
      action: "grammarCorrected",
      correctedText: resultText,
      sidechat: sidechat,
      prompt: prompt,
      model: model,
      chatId: chatId
    });
  } catch (error) {
    console.error("Error in custom action:", error);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: "grammarCorrected",
        correctedText: "",
        sidechat: !!(request && request.sidechat),
        chatId: request.chatId
      });
    }
  }
}