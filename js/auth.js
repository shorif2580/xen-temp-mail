import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// The verification and reset links return the user to this site.
// Configure this exact URL in Firebase Console > Authentication > Templates > Action URL.
export function siteUrl() {
  return window.location.origin + window.location.pathname;
}

const actionSettings = () => ({ url: siteUrl(), handleCodeInApp: false });

// Map Firebase error codes to translation keys.
export function errorKey(err) {
  const code = err?.code || "";
  const map = {
    "auth/invalid-email": "err_invalid_email",
    "auth/missing-password": "err_required",
    "auth/weak-password": "err_weak_password",
    "auth/wrong-password": "err_wrong_password",
    "auth/invalid-credential": "err_wrong_password",
    "auth/user-not-found": "err_user_not_found",
    "auth/email-already-in-use": "err_email_in_use",
    "auth/too-many-requests": "err_too_many",
    "auth/network-request-failed": "err_network",
    "auth/invalid-action-code": "invalidLink",
    "auth/expired-action-code": "expiredLink",
    "auth/no-current-user": "err_no_user",
  };
  return map[code] || "err_generic";
}

export async function register(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user, actionSettings());
  return cred.user;
}

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password).then((c) => c.user);
}

export function logout() {
  return signOut(auth);
}

// Sends a reset email. Does not reveal whether the account exists.
export async function sendReset(email) {
  try {
    await sendPasswordResetEmail(auth, email, actionSettings());
  } catch (err) {
    // Hide "user-not-found" so attackers cannot enumerate accounts.
    if (err?.code === "auth/user-not-found") return;
    throw err;
  }
}

export async function resendVerification() {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error("no user"), { code: "auth/no-current-user" });
  await sendEmailVerification(user, actionSettings());
}

// Re-reads the user's profile from Firebase so emailVerified is up to date.
export async function refreshVerified() {
  const user = auth.currentUser;
  if (!user) return false;
  await reload(user);
  return user.emailVerified === true;
}

// Handles links from email: ?mode=verifyEmail&oobCode=... or ?mode=resetPassword&oobCode=...
export async function handleActionLink(mode, oobCode) {
  if (mode === "verifyEmail") {
    await applyActionCode(auth, oobCode);
    return { type: "verified" };
  }
  if (mode === "resetPassword") {
    const email = await verifyPasswordResetCode(auth, oobCode);
    return { type: "reset", email };
  }
  throw Object.assign(new Error("unsupported"), { code: "auth/invalid-action-code" });
}

export function completePasswordReset(oobCode, newPassword) {
  return confirmPasswordReset(auth, oobCode, newPassword);
}