# Xen Temp Mail: Stage 1

Frontend, Firebase Auth, localization (English, বাংলা, Roman Hindi), and guest UI.
No backend calls yet. Mailbox creation becomes active in Stage 2.

## Run locally
Open a terminal in the folder and run: `python -m http.server 8080`
Then open http://localhost:8080 (ES modules need http, not file://).

## Deploy to GitHub Pages
1. Create a public repository, upload all files above, keeping the folder structure.
2. Settings > Pages > Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Firebase Console > Authentication > Settings > Authorized domains: add
   `shorif2580.github.io`.
4. Firebase Console > Authentication > Templates > Email address verification and
   Password reset > "Customize action URL": set it to your GitHub Pages URL
   (for example `https://shorif2580.github.io/REPO/`). This makes verification
   and reset links return to your site and show success or error messages there.
5. Firebase Console > Authentication > Sign-in method: enable Email/Password.

## Stage status
- Done: UI, responsive design, Firebase Auth (register, login, logout, forgot password,
  verification resend and refresh, action link handling), guest mode, 3 languages.
- Pending: Stage 2 (Mail.tm), Stage 3 (backend and GrabMail), Stage 4 (admin),
  Stage 5 (Firestore schema and rules), Stage 6 (review and test checklist).
- Testing: not executed in this stage. Treat all flows as unverified until you test them.