# GOVERN – political simulation (Stage 1)

Lead a country as its head of government: set taxes and budgets, face crises, win elections, build a legacy.
React + TypeScript + Vite, packaged for Android with Capacitor. Fully offline; saves stay on the phone.

## Get the APK using only your Android phone (no PC, no Android Studio, free)

1. **Create a free GitHub account** at github.com (phone browser is fine).
2. Tap **+ → New repository**. Name it `govern`, keep it **Public** (unlimited free build minutes), tap **Create repository**.
3. On the new empty repo page tap **uploading an existing file**, choose **govern-project.zip** (the file from this chat), then **Commit changes**.
   (Don't unzip it – the build unpacks it for you.)
4. Tap **Add file → Create new file**. In the name box type `.github/workflows/build-apk.yml` (typing `/` makes folders).
   Open the **build-apk.yml** file from this chat, copy its whole content, paste it in, tap **Commit changes**.
5. Tap the **Actions** tab → the *Build Android APK* run starts by itself (first build ~8–15 min). To rebuild later: Actions → *Build Android APK* → **Run workflow**.
6. When the run shows a green ✓, go to the repo's main page → **Releases** (right side / "Releases" link) → open the newest *GOVERN build N* → tap the **.apk** file to download.
7. Open the downloaded APK. Android will ask you to allow **Install unknown apps** for your browser – allow it, install, open **GOVERN**.
   If Play Protect warns about an unrecognised app, choose *Install anyway* (it is your own build).

If a build fails (red ✗), open the failed run, copy the red error text, and paste it into a new Claude session with `docs/PROGRESS.md`.

**Debug vs release:** this build is a *debug* APK (signed with the standard Android debug key). It installs and plays normally.
A properly *signed release* APK with your own key is planned for Stage 5.

## Project layout
```
src/engine/   simulation (types, countries, sim, events, programs, save) – no UI code
src/ui/       mobile screens (Overview, Economy, Government, Politics, More, modals, title)
scripts/      headless balance tests + browser E2E test
android/      Capacitor Android project
docs/         SIMULATION.md (formulas), PROGRESS.md (status for new Claude sessions)
.github/workflows/build-apk.yml   cloud APK build
```
Developer commands (if you ever have a computer / Codespace): `npm i`, `npm run dev`, `npm run build`, `npm run test:sim`.
