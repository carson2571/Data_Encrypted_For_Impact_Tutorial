// T1486 tutorial — page interactions. No external libraries.

// ---- Mobile nav toggle ----
const navToggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");
navToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", open);
});
nav.querySelectorAll("a").forEach(a =>
  a.addEventListener("click", () => {
    nav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  })
);

// ---- Reading progress bar + active nav link ----
const bar = document.getElementById("progress-bar");
const sections = [...document.querySelectorAll("main section[id]")];
const links = [...nav.querySelectorAll("a")];
function onScroll() {
  const h = document.documentElement;
  const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
  bar.style.width = pct + "%";
  let current = "";
  for (const s of sections) {
    if (s.getBoundingClientRect().top < 120) current = s.id;
  }
  links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + current));
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---- Reveal sections on scroll ----
const reveal = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); } });
}, { threshold: 0.08 });
document.querySelectorAll(".section .wrap").forEach(el => { el.classList.add("reveal"); reveal.observe(el); });

// ---- Hero: files get "locked" one by one (visual only) ----
const heroFiles = document.querySelectorAll(".locked-files .file");
heroFiles.forEach((f, i) => {
  setTimeout(() => {
    f.classList.add("locked");
    f.querySelector(".fname").textContent += ".locked";
    f.querySelector(".fstate").textContent = "encrypted";
  }, 1400 + i * 700);
});

// ---- Expandable attack steps ----
document.querySelectorAll(".step-head").forEach(btn => {
  btn.addEventListener("click", () => {
    const step = btn.parentElement;
    const open = step.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
  });
});
// Open the T1486 step by default
const keyStep = document.querySelector(".step.key");
if (keyStep) { keyStep.classList.add("open"); keyStep.querySelector(".step-head").setAttribute("aria-expanded", "true"); }

// ---- Encryption demo (AES-GCM via the browser's Web Crypto API) ----
// Encrypts only the text typed into the box. Nothing is stored or sent anywhere.
const enc = new TextEncoder();
const dec = new TextDecoder();
const out = document.getElementById("demo-out");
const status = document.getElementById("demo-status");
let lastCipher = null; // { salt, iv, data }

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}
const toB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));

function setStatus(msg, kind) {
  status.textContent = msg;
  status.className = "demo-status " + (kind || "");
}

document.getElementById("btn-encrypt").addEventListener("click", async () => {
  if (!window.crypto || !crypto.subtle) { setStatus("Your browser doesn't support Web Crypto (try opening the site over https).", "bad"); return; }
  const text = document.getElementById("demo-text").value;
  const pw = document.getElementById("demo-key").value;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pw, salt);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  lastCipher = { salt, iv, data };
  out.textContent = toB64(data);
  setStatus("Encrypted. This is what the file looks like now — random noise. Try changing the password and pressing Decrypt.", "bad");
});

document.getElementById("btn-decrypt").addEventListener("click", async () => {
  if (!lastCipher) { setStatus("Encrypt something first.", ""); return; }
  const pw = document.getElementById("demo-key").value;
  try {
    const key = await deriveKey(pw, lastCipher.salt);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: lastCipher.iv }, key, lastCipher.data);
    out.textContent = dec.decode(plain);
    setStatus("✓ Correct key — the original data is back.", "good");
  } catch {
    setStatus("✕ Wrong key. Decryption failed completely — not even partial data comes back.", "bad");
  }
});

// ---- Quick check quiz ----
const explain = {
  0: "Shadow copies are Windows restore points. Deleting them (T1490) removes an easy way to recover without paying.",
  1: "The public key can only lock. It locks each file's symmetric key; only the attacker's private key can unlock it.",
  2: "Colonial's attackers used a leaked password on a VPN account with no MFA. A second factor would have blocked that login."
};
document.querySelectorAll(".q").forEach((q, i) => {
  const answer = q.dataset.answer;
  const fb = q.querySelector(".fb");
  q.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      q.querySelectorAll("button").forEach(x => {
        x.disabled = true;
        if (x.dataset.choice === answer) x.classList.add("right");
      });
      if (b.dataset.choice !== answer) b.classList.add("wrong");
      fb.textContent = (b.dataset.choice === answer ? "Correct! " : "Not quite. ") + explain[i];
    });
  });
});
