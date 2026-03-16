// === Message handler ===
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelection") {
    const sel = window.getSelection();
    sendResponse({ selectedText: sel ? sel.toString().trim() : "" });
  }
  else if (request.action === "getSentence") {
    sendResponse({ sentence: getSelectedSentence() });
  }
  else if (request.action === "showNotification") {
    showNotification(request.message, request.type);
  }
  return false; // sync response
});

// === Extract the sentence surrounding the selection ===
function getSelectedSentence() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "";

  try {
    const range = sel.getRangeAt(0);
    let container = range.startContainer;

    // Walk up to find a block-level element
    while (container && container.nodeType !== 1) {
      container = container.parentNode;
    }
    if (!container) return "";

    // Get text content of the containing block
    const blockTags = ["P", "DIV", "LI", "TD", "TH", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6", "ARTICLE", "SECTION", "SPAN"];
    let block = container;
    while (block && !blockTags.includes(block.tagName)) {
      block = block.parentNode;
    }
    if (!block) block = container;

    const fullText = block.textContent || "";
    const selectedText = sel.toString().trim();

    if (!fullText || !selectedText) return fullText.trim().substring(0, 300);

    // Try to extract the sentence containing the selected word
    // Split by sentence-ending punctuation
    const sentences = fullText.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(selectedText.toLowerCase())) {
        return sentence.trim().substring(0, 300);
      }
    }

    // Fallback: return a window around the word
    const idx = fullText.toLowerCase().indexOf(selectedText.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(fullText.length, idx + selectedText.length + 80);
      let snippet = fullText.substring(start, end).trim();
      if (start > 0) snippet = "..." + snippet;
      if (end < fullText.length) snippet = snippet + "...";
      return snippet;
    }

    return fullText.trim().substring(0, 300);
  } catch (e) {
    console.warn("Could not extract sentence:", e);
    return "";
  }
}

// === On-page notification ===
function showNotification(message, type = "info") {
  // Remove existing notification
  const existing = document.getElementById("anki-ru-notification");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.id = "anki-ru-notification";
  el.className = `anki-ru-notif anki-ru-notif--${type}`;
  el.textContent = message;
  document.body.appendChild(el);

  // Animate in
  requestAnimationFrame(() => {
    el.classList.add("anki-ru-notif--visible");
  });

  // Auto-remove
  const duration = type === "loading" ? 10000 : 3500;
  setTimeout(() => {
    el.classList.remove("anki-ru-notif--visible");
    setTimeout(() => el.remove(), 300);
  }, duration);
}
