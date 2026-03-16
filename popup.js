const LANGUAGES = [
  { code: "af", name: "Afrikaans" },
  { code: "ar", name: "Arabic / العربية" },
  { code: "bg", name: "Bulgarian / Български" },
  { code: "bn", name: "Bengali / বাংলা" },
  { code: "ca", name: "Catalan" },
  { code: "cs", name: "Czech / Čeština" },
  { code: "da", name: "Danish / Dansk" },
  { code: "de", name: "German / Deutsch" },
  { code: "el", name: "Greek / Ελληνικά" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish / Español" },
  { code: "et", name: "Estonian / Eesti" },
  { code: "fa", name: "Persian / فارسی" },
  { code: "fi", name: "Finnish / Suomi" },
  { code: "fr", name: "French / Français" },
  { code: "he", name: "Hebrew / עברית" },
  { code: "hi", name: "Hindi / हिन्दी" },
  { code: "hr", name: "Croatian / Hrvatski" },
  { code: "hu", name: "Hungarian / Magyar" },
  { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian / Italiano" },
  { code: "ja", name: "Japanese / 日本語" },
  { code: "ko", name: "Korean / 한국어" },
  { code: "lt", name: "Lithuanian / Lietuvių" },
  { code: "lv", name: "Latvian / Latviešu" },
  { code: "ms", name: "Malay" },
  { code: "nl", name: "Dutch / Nederlands" },
  { code: "no", name: "Norwegian / Norsk" },
  { code: "pl", name: "Polish / Polski" },
  { code: "pt", name: "Portuguese / Português" },
  { code: "ro", name: "Romanian / Română" },
  { code: "ru", name: "Russian / Русский" },
  { code: "sk", name: "Slovak / Slovenčina" },
  { code: "sl", name: "Slovenian / Slovenščina" },
  { code: "sr", name: "Serbian / Српски" },
  { code: "sv", name: "Swedish / Svenska" },
  { code: "th", name: "Thai / ไทย" },
  { code: "tr", name: "Turkish / Türkçe" },
  { code: "uk", name: "Ukrainian / Українська" },
  { code: "vi", name: "Vietnamese / Tiếng Việt" },
  { code: "zh", name: "Chinese / 中文" },
];

const sourceSelect = document.getElementById("sourceLang");
const targetSelect = document.getElementById("targetLang");
const deckSelect = document.getElementById("deckSelect");
const deckInput = document.getElementById("deckInput");
const deckHint = document.getElementById("deckHint");
const saveBtn = document.getElementById("saveBtn");
const testBtn = document.getElementById("testBtn");
const statusEl = document.getElementById("status");

// --- Populate language dropdowns ---
for (const lang of LANGUAGES) {
  sourceSelect.add(new Option(lang.name, lang.code));
  targetSelect.add(new Option(lang.name, lang.code));
}

// --- Load saved settings, then try to connect ---
chrome.storage.sync.get(["deckName", "sourceLang", "targetLang"], (data) => {
  sourceSelect.value = data.sourceLang || "en";
  targetSelect.value = data.targetLang || "ru";

  const savedDeck = data.deckName || "Vocabulary";
  deckInput.value = savedDeck;

  // Try to load decks from Anki
  loadDecks(savedDeck);
});

// --- Fetch decks from Anki and switch to dropdown if available ---
async function loadDecks(selectedDeck) {
  try {
    const response = await fetch("http://localhost:8765", {
      method: "POST",
      body: JSON.stringify({ action: "deckNames", version: 6 })
    });
    const data = await response.json();

    if (data.result && data.result.length > 0) {
      // Success — show dropdown, hide text input
      deckSelect.innerHTML = "";

      // Filter out "Default" if there are other decks
      const decks = data.result.filter(d => d !== "Default" || data.result.length === 1);

      for (const deck of decks) {
        deckSelect.add(new Option(deck, deck));
      }

      // If saved deck exists in list, select it
      if (decks.includes(selectedDeck)) {
        deckSelect.value = selectedDeck;
      }

      deckSelect.style.display = "";
      deckInput.style.display = "none";
      deckHint.style.display = "none";
    } else {
      showFallbackInput(selectedDeck);
    }
  } catch (e) {
    // Anki not running — show text input with hint
    showFallbackInput(selectedDeck);
    deckHint.textContent = "Anki not detected. You can type a deck name now and connect later.";
    deckHint.style.display = "";
  }
}

function showFallbackInput(value) {
  deckSelect.style.display = "none";
  deckInput.style.display = "";
  deckInput.value = value;
}

// --- Get current deck name from whichever control is visible ---
function getCurrentDeck() {
  if (deckSelect.style.display !== "none") {
    return deckSelect.value;
  }
  return deckInput.value.trim() || "Vocabulary";
}

// --- Save ---
saveBtn.addEventListener("click", () => {
  const settings = {
    deckName: getCurrentDeck(),
    sourceLang: sourceSelect.value,
    targetLang: targetSelect.value
  };
  chrome.storage.sync.set(settings, () => {
    showStatus("Saved ✓", "ok");
  });
});

// --- Test connection (also refreshes deck list) ---
testBtn.addEventListener("click", async () => {
  try {
    const response = await fetch("http://localhost:8765", {
      method: "POST",
      body: JSON.stringify({ action: "deckNames", version: 6 })
    });
    const data = await response.json();
    if (data.result) {
      showStatus(`Connected! ${data.result.length} deck(s) found.`, "ok");
      // Refresh dropdown
      loadDecks(getCurrentDeck());
    } else {
      showStatus(`AnkiConnect error: ${data.error}`, "err");
    }
  } catch (e) {
    showStatus("Cannot connect to Anki. Make sure Anki is running with AnkiConnect.", "err");
  }
});

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `status status--${type}`;
}
