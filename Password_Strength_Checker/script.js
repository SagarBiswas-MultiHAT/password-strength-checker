/* script.js — 10/10 version


Features:
- Entropy estimation (character pool method + small pattern penalties)
- Pattern detection: repeated characters, sequential characters, keyboard sequences
- Real-time checklist and suggestions
- Accessible updates (aria-live)
- Password generator and copy button


Notes:
- This is a heuristic estimator for guidance, not a formal cryptanalysis tool.
- All work is done locally in the browser; nothing is transmitted.
*/

const passwordEl = document.getElementById("password");
const meterBar = document.getElementById("meterBar");
const strengthText = document.getElementById("strengthText");
const checksList = document.getElementById("checks");
const toggleVis = document.getElementById("toggleVis");
const generateBtn = document.getElementById("generate");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");

// small in-memory set of extremely common passwords for quick checks.
// This is not exhaustive.
const COMMON = new Set([
  "123456",
  "password",
  "123456789",
  "12345678",
  "12345",
  "qwerty",
  "abc123",
  "password1",
  "111111",
  "1234",
]);

passwordEl.addEventListener("input", onInput);
toggleVis.addEventListener("click", toggleVisibility);
generateBtn.addEventListener("click", generatePassword);
copyBtn.addEventListener("click", copyPassword);
clearBtn.addEventListener("click", clearPassword);

// initial render
renderChecks("");

function onInput() {
  const pw = passwordEl.value;
  const analysis = analyzePassword(pw);
  renderMeter(analysis);
  renderChecks(pw, analysis);
}

function analyzePassword(pw) {
  const length = pw.length;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  // estimate pool size
  let pool = 0;
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSymbol) pool += 32; // rough estimate of common printable symbols

  // entropy estimate (bits) using Shannon approx: log2(pool^length) = length * log2(pool)
  let entropy = 0;
  if (pool > 0 && length > 0) entropy = length * Math.log2(pool);

  // pattern penalties
  const repeats = countRepeatedSequences(pw); // number of repeated sequences
  const seqs = countSequentialRuns(pw); // number of sequential runs (e.g., 'abcd', '1234')
  const keyboardSeqs = countKeyboardSequences(pw);

  // subtract small penalties — heuristics
  const penalty = repeats * 1.5 + seqs * 2 + keyboardSeqs * 2.5;
  const adjustedEntropy = Math.max(0, entropy - penalty);

  // classify with heuristic thresholds (informational; these are not absolute)
  let score = 0; // 0..5
  if (adjustedEntropy < 28)
    score = 0; // very weak
  else if (adjustedEntropy < 36)
    score = 1; // weak
  else if (adjustedEntropy < 60)
    score = 2; // fair
  else if (adjustedEntropy < 80)
    score = 3; // good
  else if (adjustedEntropy < 120)
    score = 4; // very good
  else score = 5; // excellent

  // suggestions
  const suggestions = [];
  if (length < 12)
    suggestions.push(
      "Use at least 12 characters. Longer passwords are generally stronger.",
    );
  if (!hasDigit) suggestions.push("Add digits (0–9).");
  if (!hasUpper) suggestions.push("Add uppercase letters (A–Z).");
  if (!hasSymbol)
    suggestions.push("Include special characters like !@#$%&*().");
  if (repeats > 0)
    suggestions.push("Avoid repeated characters or repeated sequences.");
  if (seqs > 0)
    suggestions.push('Avoid simple sequential patterns like "abcd" or "1234".');
  if (COMMON.has(pw.toLowerCase()))
    suggestions.unshift(
      "This password is extremely common — choose a different one.",
    );

  return {
    length,
    hasLower,
    hasUpper,
    hasDigit,
    hasSymbol,
    pool,
    entropy,
    adjustedEntropy,
    repeats,
    seqs,
    keyboardSeqs,
    score,
    suggestions,
  };
}
function renderMeter(analysis) {
  const score = analysis.score;
  const percent = Math.round(
    (analysis.adjustedEntropy /
      Math.max(1, Math.min(200, analysis.adjustedEntropy))) *
      100,
  );
  // map score to colors
  let color = "var(--accent-weak)";
  let label = "—";
  switch (score) {
    case 0:
      color = "var(--accent-weak)";
      label = "Very Weak";
      break;
    case 1:
      color = "var(--accent-weak)";
      label = "Weak";
      break;
    case 2:
      color = "var(--accent-mid)";
      label = "Fair";
      break;
    case 3:
      color = "var(--accent-good)";
      label = "Good";
      break;
    case 4:
      color = "var(--accent-strong)";
      label = "Very Good";
      break;
    case 5:
      color = "var(--accent-strong)";
      label = "Excellent";
      break;
  }

  // clamp percent to sensible range for visual
  const visualPercent = Math.min(100, Math.max(6, percent));
  meterBar.style.width = visualPercent + "%";
  meterBar.style.backgroundColor = color;

  strengthText.textContent = `Strength: ${label} — ${Math.round(analysis.adjustedEntropy)} bits (est.)`;
}

function renderChecks(pw, analysis = null) {
  // If analysis not provided, compute basic values
  if (!analysis) analysis = analyzePassword(pw);

  const items = [];
  items.push({
    ok: pw.length >= 12,
    text: `Length: ${pw.length} characters (recommended 12+)`,
  });
  items.push({ ok: analysis.hasLower, text: "Contains lowercase letters" });
  items.push({ ok: analysis.hasUpper, text: "Contains uppercase letters" });
  items.push({ ok: analysis.hasDigit, text: "Contains digits" });
  items.push({ ok: analysis.hasSymbol, text: "Contains special characters" });
  items.push({
    ok: analysis.repeats === 0,
    text: "No obvious repeated sequences",
  });
  items.push({
    ok: analysis.seqs === 0,
    text: "No obvious sequential characters",
  });
  items.push({
    ok: !COMMON.has(pw.toLowerCase()),
    text: "Not an extremely common password",
  });
  // update DOM
  checksList.innerHTML = "";
  for (const it of items) {
    const li = document.createElement("li");
    li.className = it.ok ? "ok" : it.text.includes("No") ? "bad" : "warn";
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = it.ok ? "✓" : "•";
    li.appendChild(icon);

    const txt = document.createElement("span");
    txt.style.marginLeft = "8px";
    txt.textContent = it.text;
    li.appendChild(txt);

    checksList.appendChild(li);
  }

  // suggestions area: if suggestions exist, add a final `li` with them
  if (analysis.suggestions && analysis.suggestions.length) {
    const sep = document.createElement("li");
    sep.style.marginTop = "8px";
    sep.style.fontWeight = "600";
    sep.textContent = "Suggestions:";
    checksList.appendChild(sep);

    for (const s of analysis.suggestions) {
      const li = document.createElement("li");
      li.className = "warn";
      li.textContent = s;
      checksList.appendChild(li);
    }
  }
}
/* Utility: count repeated sequences like 'aaaa' or 'ababab' */
function countRepeatedSequences(s) {
  if (!s) return 0;
  let repeats = 0;
  // detect runs of the same character
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1]) run++;
    else {
      if (run > 2) repeats++;
      run = 1;
    }
  }
  if (run > 2) repeats++;

  // detect short repeated substrings (e.g., 'ababab') — heuristic
  for (let len = 1; len <= 4; len++) {
    for (let i = 0; i + len * 2 <= s.length; i++) {
      const part = s.slice(i, i + len);
      const next = s.slice(i + len, i + len * 2);
      if (part && part === next) repeats++;
    }
  }
  return Math.max(0, repeats);
}

/* count sequential runs like 'abcd' or '4321' */
function countSequentialRuns(s) {
  if (!s) return 0;
  let runs = 0;
  let runLen = 1;
  for (let i = 1; i < s.length; i++) {
    const prev = s.charCodeAt(i - 1);
    const cur = s.charCodeAt(i);
    if (cur === prev + 1 || cur === prev - 1) runLen++;
    else {
      if (runLen >= 3) runs++;
      runLen = 1;
    }
  }
  if (runLen >= 3) runs++;
  return runs;
}

/* detect common keyboard sequences — a small heuristic (qwerty patterns etc.) */
function countKeyboardSequences(s) {
  if (!s) return 0;
  const lower = s.toLowerCase();
  const keyboardPatterns = [
    "qwerty",
    "asdf",
    "zxcv",
    "12345",
    "!@#$%",
    "qaz",
    "wsx",
  ];
  let found = 0;
  for (const p of keyboardPatterns) {
    if (lower.includes(p)) found++;
  }
  return found;
}

/* Password generator — configurable but simple */
function generatePassword() {
  const length = 16; // good default
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{};:,.<>?";
  const all = lowers + uppers + digits + symbols;

  // ensure at least one of each class
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  let out = "";
  out += pick(lowers);
  out += pick(uppers);
  out += pick(digits);
  out += pick(symbols);
  for (let i = 4; i < length; i++) out += pick(all);

  // shuffle
  out = out
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
  passwordEl.value = out;
  passwordEl.type = "text";
  toggleVis.setAttribute("aria-pressed", "true");
  toggleVis.textContent = "Hide";
  onInput();
}
function toggleVisibility() {
  const isPwd = passwordEl.type === "password";
  passwordEl.type = isPwd ? "text" : "password";
  toggleVis.setAttribute("aria-pressed", String(isPwd));
  toggleVis.textContent = isPwd ? "Hide" : "Show";
}

async function copyPassword() {
  try {
    await navigator.clipboard.writeText(passwordEl.value || "");
    copyBtn.textContent = "Copied";
    setTimeout(() => (copyBtn.textContent = "Copy password"), 1500);
  } catch (e) {
    // fallback
    try {
      passwordEl.select();
      document.execCommand("copy");
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy password"), 1500);
    } catch (err) {
      copyBtn.textContent = "Copy failed";
      setTimeout(() => (copyBtn.textContent = "Copy password"), 1500);
    }
  }
}

function clearPassword() {
  passwordEl.value = "";
  passwordEl.type = "password";
  toggleVis.textContent = "Show";
  toggleVis.setAttribute("aria-pressed", "false");
  onInput();
}
