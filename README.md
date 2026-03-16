# 📝 Anki Translate Card

A Chrome extension that creates Anki flashcards with translations in one click.

Select a word → right-click → flashcard in Anki. No manual copying. No card setup.

**Any language → Any language.** English→Spanish, French→German, Japanese→English — you choose.

## What it does

- **All translation variants** grouped by part of speech (noun, verb, adjective...)
- **Usage examples** in the source language
- **Source sentence** from the page where you found the word — so months later you remember *where* you first saw it
- **Link to the original page** — click to revisit the article where you found the word
- **Zero configuration in Anki** — the extension creates its own card type and deck automatically. Just install, pick your languages, and go.
- **Duplicate detection** — won't create a card if the word already exists in your deck
- **Keyboard shortcut** — `Ctrl+Shift+A` (or right-click → «📝 Anki: create flashcard»)

## What a card looks like

**Front:**
> trunk

**Back:**
> *noun:* **tronco, maletero, baúl, trompa**
> *verb:* **guardar en un baúl**
>
> ---
> **Examples:**
> - He put the bags in the trunk of the car
> - The elephant picked up the fruit with its trunk
>
> ---
> **Context:**
> The driver opened the **trunk** and loaded our suitcases.
>
> [BBC News - Travel tips for Europe](https://example.com)

## Installation

Total setup time: ~3 minutes. No card templates or field configuration needed — the extension handles everything automatically.

### 1. Anki + AnkiConnect

1. Install [Anki](https://apps.ankiweb.net/) on your computer
2. In Anki: **Tools → Add-ons → Get Add-ons** → enter code `2055492159` → OK
3. Select **AnkiConnect → Config** in the add-on list
4. Replace `"http://localhost"` with `"*"` in the `webCorsOriginList` line:
```json
"webCorsOriginList": [
    "*"
]
```
5. Click OK and **restart Anki**

### 2. Chrome extension

1. [Download ZIP](../../archive/refs/heads/main.zip) of this repository
2. Unpack to any folder (e.g. `C:\anki-translate-card`)
3. Open `chrome://extensions` in Chrome
4. Enable **Developer mode** (toggle in the top right)
5. Click **Load unpacked** → select the unpacked folder
6. Done — the extension icon appears in your toolbar

### 3. Setup

1. Click the extension icon in the toolbar
2. Choose your **source language** (the language you're reading) and **target language** (the language you know)
3. Enter a deck name (default: "Vocabulary")
4. Click **Test Anki connection** — should show your deck list
5. Click **Save**

## Usage

1. **Anki must be running** (the extension talks to it via local API)
2. Open any webpage in the source language
3. Select a word
4. Right-click → **«📝 Anki: create flashcard»** (or `Ctrl+Shift+A`)
5. A notification appears in the top-right corner confirming the card was created

## Mobile sync

Cards automatically appear on your phone if you set up Anki sync:

1. Register at [AnkiWeb](https://ankiweb.net/) (free)
2. In desktop Anki: **Sync** (or `Ctrl+Y`) → sign in
3. On your phone install [AnkiDroid](https://play.google.com/store/apps/details?id=com.ichi2.anki) (Android, free) or [Anki Mobile](https://apps.apple.com/app/anki-mobile-flashcards/id373493387) (iPhone, $24.99)
4. Sign in with the same account — cards sync automatically

Create cards on desktop, review anywhere.

## Privacy & Security

The extension does exactly three things:
- Reads the selected text on the page
- Sends the word to Google Translate API (`translate.googleapis.com`) to get translations
- Sends the card to your local Anki (`localhost:8765`) via AnkiConnect

No third-party servers, no data collection, no cookies. All code is open source.

## Technical details

- Manifest V3
- Google Translate API (free, no key required)
- AnkiConnect API (localhost:8765)
- Automatically creates "Translate Card" note type on first use

## Supported languages

Any language pair supported by Google Translate — 40+ languages including English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi, and many more.

## FAQ

**Do I need to configure card templates in Anki?**
No. The extension automatically creates a "Translate Card" note type with properly formatted fields on first use. Your cards will look good out of the box.

**What if I already have my own card templates?**
The extension creates its own note type and doesn't touch your existing ones. If you want to use a custom template, you'd need to modify the source code (contributions welcome).

**Why does the card include the source sentence?**
Context helps memory. When you review a card months later, seeing "I read this in an article about climate change" triggers stronger recall than seeing the word in isolation. This is a well-known technique in spaced repetition learning.

**Is Google Translate API free?**
The extension uses the same free API endpoint that Google's own Chrome translation feature uses. For normal personal use (dozens of words per day), there's no risk of rate limiting.

## Backstory

This extension was born out of frustration: none of the dozens of existing Anki browser extensions could do everything together — all translation variants, examples, context, and direct one-click export to Anki. So I built one.

## Support

Found a bug or have a feature request? [Open an issue](https://github.com/bocharsky/anki-translate-card/issues) on GitHub.

## Author

**Konstantin Bocharskiy** — [GitHub](https://github.com/bocharsky)

*Built with Claude (Anthropic). I defined the requirements and tested — Claude wrote the code.*

⭐ If this extension is useful to you, star the repo — it helps others find it.

## License

MIT — do whatever you want.
