import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { t, setLang, applyI18n, getLang, LANGS } from "./i18n.js";
import {
  login, register, logout, sendReset, resendVerification,
  refreshVerified, handleActionLink, completePasswordReset, errorKey,
} from "./auth.js";

// ---------- DOM helpers ----------
const $ = (sel) => document.querySelector(sel);
const show = (el, on = true) => el && el.classList.toggle("hidden", !on);

const els = {
  authView: $("#auth-view"),
  resetView: $("#reset-view"),
  appView: $("#app-view"),
  logoutBtn: $("#logout-btn"),
  langSelect: $("#lang-select"),
  verifyBanner: $("#verify-banner"),
  guestBanner: $("#guest-banner"),
  sendVerifyBtn: $("#send-verify-btn"),
  checkVerifyBtn: $("#check-verify-btn"),
  createBtn: $("#create-mailbox-btn"),
  mailboxMsg: $("#mailbox-msg"),
};

// ---------- Toasts ----------
export function toast(message, type = "info") {
  const root = $("#toast-root");
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.setAttribute("role", "status");
  node.textContent = message; // textContent only: never innerHTML for messages
  root.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

// ---------- Guest identity (Stage 2 uses this for mailbox ownership) ----------
const GUEST_KEY = "xen_guest_mode";
const GUEST_ID_KEY = "xen_guest_id";

function getOrCreateGuestId() {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = crypto.randomUUID(); // cryptographically secure random ID
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch (_) {
    return null; // storage blocked
  }
}
function isGuestMode() {
  try { return sessionStorage.getItem(GUEST_KEY) === "1"; } catch (_) { return false; }
}
function setGuestMode(on) {
  try {
    if (on) sessionStorage.setItem(GUEST_KEY, "1");
    else sessionStorage.removeItem(GUEST_KEY);
  } catch (_) {}
}

// ---------- Form helpers ----------
function clearErrors(form) {
  form.querySelectorAll(".field-error").forEach((n) => (n.textContent = ""));
  form.querySelectorAll(".invalid").forEach((n) => n.classList.remove("invalid"));
}
function fieldError(input, key) {
  input.classList.add("invalid");
  let err = input.parentElement.querySelector(".field-error");
  if (!err) {
    err = document.createElement("div");
    err.className = "field-error";
    input.parentElement.appendChild(err);
  }
  err.textContent = t(key);
}
function validate(form, fields) {
  clearErrors(form);
  let ok = true;
  for (const [name, rules] of Object.entries(fields)) {
    const input = form.elements[name];
    const val = input.value.trim();
    if (!val) { fieldError(input, "err_required"); ok = false; continue; }
    if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { fieldError(input, "err_invalid_email"); ok = false; }
    if (rules.minLen && input.value.length < rules.minLen) { fieldError(input, "err_short_password"); ok = false; }
    if (rules.matchName && input.value !== form.elements[rules.matchName].value) { fieldError(form.elements[rules.matchName], "err_mismatch"); ok = false; }
  }
  return ok;
}

// Prevents double submits on slow mobile networks.
async function withBusy(button, fn) {
  if (button.disabled) return;
  button.disabled = true;
  try { return await fn(); } finally { button.disabled = false; }
}

// ---------- Views ----------
function showView(name) {
  show(els.authView, name === "auth");
  show(els.resetView, name === "reset");
  show(els.appView, name === "app");
}

function renderSignedIn(user) {
  showView("app");
  show(els.logoutBtn, true);
  const verified = user.emailVerified === true;
  show(els.verifyBanner, !verified);
  show(els.guestBanner, false);
  // Unverified users cannot generate mailboxes.
  els.createBtn.disabled = !verified;
  els.createBtn.title = verified ? "" : t("mailboxLocked");
  els.mailboxMsg.textContent = verified ? t("mailboxSoon") : t("mailboxLocked");
}

function renderGuest() {
  showView("app");
  show(els.logoutBtn, false);
  show(els.verifyBanner, false);
  show(els.guestBanner, true);
  els.createBtn.disabled = true;
  els.mailboxMsg.textContent = t("mailboxGuestLocked");
  getOrCreateGuestId();
}

function renderLoggedOut() {
  setGuestMode(false);
  showView("auth");
  show(els.logoutBtn, false);
}

function render(user) {
  if (user) return renderSignedIn(user);
  if (isGuestMode()) return renderGuest();
  return renderLoggedOut();
}

// ---------- Auth tabs ----------
function switchTab(name) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  show($("#login-form"), name === "login");
  show($("#register-form"), name === "register");
  show($("#forgot-form"), false);
}

document.querySelectorAll(".tab").forEach((b) =>
  b.addEventListener("click", () => switchTab(b.dataset.tab))
);

$("#forgot-btn").addEventListener("click", () => {
  show($("#login-form"), false);
  show($("#register-form"), false);
  show($("#forgot-form"), true);
});
$("#back-login-btn").addEventListener("click", () => switchTab("login"));

// ---------- Form submissions ----------
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!validate(form, { email: { email: true }, password: { minLen: 6 } })) return;
  await withBusy(form.querySelector("button"), async () => {
    try {
      await login(form.elements.email.value.trim(), form.elements.password.value);
      toast(t("welcomeBack"), "success");
    } catch (err) {
      toast(t(errorKey(err)), "error");
    }
  });
});

$("#register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!validate(form, {
    email: { email: true },
    password: { minLen: 6 },
    confirm: { minLen: 6, matchName: "password" },
  })) return;
  await withBusy(form.querySelector("button"), async () => {
    try {
      await register(form.elements.email.value.trim(), form.elements.password.value);
      toast(t("accountCreated"), "success");
    } catch (err) {
      toast(t(errorKey(err)), "error");
    }
  });
});

$("#forgot-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!validate(form, { email: { email: true } })) return;
  await withBusy(form.querySelector("button"), async () => {
    try {
      await sendReset(form.elements.email.value.trim());
      toast(t("resetSent"), "success");
      switchTab("login");
    } catch (err) {
      toast(t(errorKey(err)), "error");
    }
  });
});

$("#reset-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!validate(form, { password: { minLen: 6 } })) return;
  const oob = form.dataset.oob;
  await withBusy(form.querySelector("button"), async () => {
    try {
      await completePasswordReset(oob, form.elements.password.value);
      toast(t("resetDone"), "success");
      showView("auth");
      switchTab("login");
      clearActionParams();
    } catch (err) {
      toast(t(errorKey(err)), "error");
    }
  });
});

$("#guest-btn").addEventListener("click", () => {
  setGuestMode(true);
  render(null);
});

els.logoutBtn.addEventListener("click", async () => {
  try {
    await logout();
    toast(t("loggedOut"));
  } catch (err) {
    toast(t(errorKey(err)), "error");
  }
});

document.querySelectorAll('[data-action="goto-auth"]').forEach((b) =>
  b.addEventListener("click", () => {
    setGuestMode(false);
    render(null);
  })
);

// ---------- Verification controls ----------
els.sendVerifyBtn.addEventListener("click", () =>
  withBusy(els.sendVerifyBtn, async () => {
    try {
      await resendVerification();
      toast(t("verifySent"), "success");
    } catch (err) {
      toast(t(errorKey(err)), "error");
    }
  })
);

els.checkVerifyBtn.addEventListener("click", () =>
  withBusy(els.checkVerifyBtn, async () => {
    try {
      const ok = await refreshVerified();
      if (ok) {
        toast(t("verifiedOk"), "success");
        render(auth.currentUser);
      } else {
        toast(t("verifyStillNot"), "error");
      }
    } catch (err) {
      toast(t(errorKey(err)), "error");
    }
  })
);

// Return from another tab: refresh verification state when the user comes back.
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible" || !auth.currentUser) return;
  if (auth.currentUser.emailVerified) return;
  try {
    if (await refreshVerified()) render(auth.currentUser);
  } catch (_) {}
});

// ---------- Email action links ----------
function clearActionParams() {
  history.replaceState(null, "", window.location.pathname);
}

async function processActionLink() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");
  if (!mode || !oobCode) return false;

  try {
    const result = await handleActionLink(mode, oobCode);
    if (result.type === "verified") {
      toast(t("verifyLinkDone"), "success");
      clearActionParams();
      if (auth.currentUser) await refreshVerified().catch(() => {});
    } else if (result.type === "reset") {
      showView("reset");
      $("#reset-form").dataset.oob = oobCode;
    }
  } catch (err) {
    toast(t(errorKey(err)), "error");
    clearActionParams();
  }
  return true;
}

// ---------- Language selector ----------
function initLanguage() {
  els.langSelect.value = getLang();
  els.langSelect.addEventListener("change", (e) => setLang(e.target.value));
  document.addEventListener("langchange", () => {
    if (auth.currentUser) render(auth.currentUser);
    else render(null);
  });
  setLang(getLang());
}

// ---------- Boot ----------
let booted = false;

initLanguage();
applyI18n();

onAuthStateChanged(auth, async (user) => {
  if (!booted) {
    booted = true;
    const handled = await processActionLink();
    if (handled && $("#reset-view").classList.contains("hidden") === false) return;
  }
  render(user);
});