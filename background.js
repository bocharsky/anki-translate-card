// === Context Menu ===
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "create-anki-card",
    title: "📝 Anki: create flashcard",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "create-anki-card" && info.selectionText) {
    await createFlashcard(info.selectionText.trim(), tab.id);
  }
});

// === Keyboard shortcut ===
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "create-flashcard") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: "getSelection" });
      if (response && response.selectedText) {
        await createFlashcard(response.selectedText.trim(), tab.id);
      }
    } catch (e) {
      console.error("Failed to get selection:", e);
    }
  }
});

// === Main flow ===
async function createFlashcard(word, tabId) {
  try {
    sendNotification(tabId, "⏳ Translating...", "loading");

    // 1. Get surrounding sentence and page URL
    let sourceSentence = "";
    let pageUrl = "";
    let pageTitle = "";
    try {
      const resp = await chrome.tabs.sendMessage(tabId, { action: "getSentence" });
      sourceSentence = resp?.sentence || "";
    } catch (e) {
      console.warn("Could not get sentence context:", e);
    }
    try {
      const tab = await chrome.tabs.get(tabId);
      pageUrl = tab?.url || "";
      pageTitle = tab?.title || "";
    } catch (e) {}

    // 2. Get settings (languages, deck)
    const settings = await getSettings();

    // 3. Get translations
    const translationData = await fetchTranslations(word, settings.sourceLang, settings.targetLang);

    // 4. Format the card
    const card = formatCard(word, translationData, sourceSentence, pageUrl, pageTitle);

    // 5. Ensure note type exists in Anki
    await ensureNoteType();

    // 6. Send to Anki
    await addToAnki(card, settings.deckName);

    sendNotification(tabId, `✅ «${word}» → added to Anki`, "success");

  } catch (error) {
    console.error("Flashcard creation failed:", error);
    sendNotification(tabId, `❌ Error: ${error.message}`, "error");
  }
}

// === Google Translate API ===
async function fetchTranslations(word, sourceLang, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&hl=${targetLang}&dt=t&dt=bd&dt=ex&dt=md&q=${encodeURIComponent(word)}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Translation failed");

  const data = await response.json();

  const result = {
    mainTranslation: "",
    dictionaryEntries: [],
    examples: [],
  };

  // [0] = basic translation
  if (data[0] && data[0][0]) {
    result.mainTranslation = data[0][0][0] || "";
  }

  // [1] = dictionary entries grouped by part of speech
  if (data[1]) {
    for (const entry of data[1]) {
      const partOfSpeech = entry[0] || "";
      const translations = entry[1] || [];
      if (translations.length > 0) {
        result.dictionaryEntries.push({
          partOfSpeech,
          translations: translations.slice(0, 8)
        });
      }
    }
  }

  // [13] = examples
  try {
    if (data[13] && Array.isArray(data[13][0])) {
      for (const ex of data[13][0]) {
        if (ex && ex[0] && typeof ex[0] === "string") {
          const clean = ex[0].replace(/<\/?b>/g, "").replace(/<\/?i>/g, "");
          result.examples.push(clean);
        }
      }
      result.examples = result.examples.slice(0, 4);
    }
  } catch (e) {
    console.warn("Could not parse examples:", e);
  }

  return result;
}

// === Format card HTML ===
function formatCard(word, data, sourceSentence, pageUrl, pageTitle) {
  let translationsHtml = "";

  if (data.dictionaryEntries.length > 0) {
    for (const entry of data.dictionaryEntries) {
      const pos = entry.partOfSpeech ? `<i>${entry.partOfSpeech}</i>: ` : "";
      translationsHtml += `<div class="pos-group">${pos}<b>${entry.translations.join(", ")}</b></div>`;
    }
  } else if (data.mainTranslation) {
    translationsHtml = `<b>${data.mainTranslation}</b>`;
  } else {
    translationsHtml = "<i>no translation found</i>";
  }

  let examplesHtml = "";
  if (data.examples.length > 0) {
    examplesHtml = `<div class="examples"><hr><b>Examples:</b><ul>`;
    for (const ex of data.examples) {
      examplesHtml += `<li>${ex}</li>`;
    }
    examplesHtml += `</ul></div>`;
  }

  let sourceHtml = "";
  if (sourceSentence) {
    const highlighted = sourceSentence.replace(
      new RegExp(`(${escapeRegex(word)})`, "gi"),
      "<b>$1</b>"
    );
    sourceHtml = `<div class="source"><hr><b>Context:</b><br>${highlighted}</div>`;
  }

  // Source page link — show domain only, full title on hover
  let linkHtml = "";
  if (pageUrl && !pageUrl.startsWith("chrome")) {
    try {
      const domain = new URL(pageUrl).hostname.replace("www.", "");
      const tooltip = pageTitle ? pageTitle.replace(/"/g, "&quot;") : pageUrl;
      linkHtml = `<div class="page-link">📎 <a href="${pageUrl}" title="${tooltip}">${domain}</a></div>`;
    } catch (e) {
      linkHtml = `<div class="page-link">📎 <a href="${pageUrl}">source</a></div>`;
    }
  }

  return {
    front: word,
    back: `${translationsHtml}${examplesHtml}${sourceHtml}${linkHtml}`
  };
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// === AnkiConnect ===
const ANKI_URL = "http://localhost:8765";
const NOTE_TYPE = "Translate Card";

async function ankiRequest(action, params = {}) {
  const response = await fetch(ANKI_URL, {
    method: "POST",
    body: JSON.stringify({ action, version: 6, params })
  });
  if (!response.ok) {
    throw new Error("Anki is not running or AnkiConnect is not installed");
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.result;
}

async function ensureNoteType() {
  const models = await ankiRequest("modelNames");
  if (models.includes(NOTE_TYPE)) return;

  await ankiRequest("createModel", {
    modelName: NOTE_TYPE,
    inOrderFields: ["Word", "Back"],
    css: `.card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 18px;
  text-align: left;
  color: #1a1a1a;
  background: #fafaf8;
  padding: 24px;
  line-height: 1.6;
}
.card .word { font-size: 28px; font-weight: 700; margin-bottom: 16px; color: #2d2d2d; }
.pos-group { margin: 4px 0; }
.pos-group i { color: #888; font-size: 0.85em; }
.examples { margin-top: 12px; color: #444; }
.examples ul { margin: 4px 0; padding-left: 20px; }
.examples li { margin: 4px 0; }
.source { margin-top: 12px; color: #666; font-size: 0.9em; }
.source b { color: #c0392b; }
.page-link { margin-top: 10px; font-size: 0.75em; color: #bbb; }
.page-link a { color: #bbb; text-decoration: none; border-bottom: 1px dotted #ccc; }
.page-link a:hover { color: #888; border-bottom-color: #888; }
hr { border: none; border-top: 1px solid #e0e0e0; margin: 12px 0; }`,
    cardTemplates: [
      {
        Name: "Card 1",
        Front: `<div class="word">{{Word}}</div>`,
        Back: `<div class="word">{{Word}}</div><hr>{{Back}}`
      }
    ]
  });
}

async function addToAnki(card, deckName) {
  await ankiRequest("createDeck", { deck: deckName });

  const dupes = await ankiRequest("findNotes", {
    query: `"Word:${card.front}" "note:${NOTE_TYPE}" "deck:${deckName}"`
  });

  if (dupes && dupes.length > 0) {
    throw new Error(`«${card.front}» already exists in deck`);
  }

  await ankiRequest("addNote", {
    note: {
      deckName: deckName,
      modelName: NOTE_TYPE,
      fields: {
        Word: card.front,
        Back: card.back
      },
      options: {
        allowDuplicate: false,
        duplicateScope: "deck"
      },
      tags: ["from-browser"]
    }
  });
}

// === Settings ===
async function getSettings() {
  const defaults = {
    deckName: "Vocabulary",
    sourceLang: "en",
    targetLang: "ru"
  };
  try {
    const stored = await chrome.storage.sync.get(["deckName", "sourceLang", "targetLang"]);
    return { ...defaults, ...stored };
  } catch {
    return defaults;
  }
}

// === Notifications ===
function sendNotification(tabId, message, type) {
  try {
    chrome.tabs.sendMessage(tabId, {
      action: "showNotification",
      message,
      type
    });
  } catch (e) {
    console.warn("Could not send notification:", e);
  }
}
