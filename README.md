# Password Strength Checker — 10/10 Version

**What it is**
A polished, accessible client-side password strength checker that estimates entropy, detects weak patterns, offers actionable suggestions, and includes a password generator. Suitable for demos, portfolios, or as a frontend component in larger projects.

### live: 

![](https://imgur.com/EsisIt6.png)

---

**Files**

- `index.html` — main markup
- `styles.css` — responsive styles
- `script.js` — password analysis logic

**Why this is better than a simple rule-counter**

- Uses a basic entropy estimate (character pool × length) rather than just counting satisfied rules.
- Applies small penalties for repeated characters and sequential patterns.
- Provides concrete suggestions and visible checks to help users improve passwords.

**Security notes & limitations**

- This tool is **advisory**. Entropy estimation is heuristic and intended to guide users, not to provide cryptographic guarantees.
- No network calls are made; passwords remain local to the browser.
- For production: enforce server-side password policies (do not rely only on client checks), consider using established libraries for password strength and breach-checking with proper privacy-preserving protocols.

**Accessibility**

- The strength text and checks update with `aria-live` to inform assistive technologies.
- Buttons and controls have labels and `aria-pressed` where appropriate.

**How to use**

1. Copy the three files into a folder.
2. Open `index.html` in a browser or publish via GitHub Pages.

**How to extend**

- Add integration with a privacy-preserving breach API (if you want to check if a password was seen in public leaks) — only with hashed queries and user consent.
- Replace the simple entropy model with a library like `zxcvbn` if you need a more robust score (note: `zxcvbn` is bigger and has a different tradeoff).
