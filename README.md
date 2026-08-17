# 🤜 RPS Gesture Detector

A browser-based **Rock-Paper-Scissors** game that uses your webcam and real-time hand gesture recognition to detect your move — no buttons, no clicks, just show your hand!

![Screenshot](screenshot.png)

---

## ✨ Features

- 🎥 **Live webcam feed** — mirrored for a natural selfie-camera feel
- 🤖 **Real-time gesture detection** — powered by [MediaPipe Gesture Recognizer](https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer)
- ✊ 🖐 ✌️ Detects **Rock, Paper, Scissors** hand shapes
- 🔒 **Hold-to-lock** — keep your gesture steady for 1 second to confirm your move
- 🎮 **Random computer opponent** — `Math.random()` picks the computer's move
- 📊 **Live scoreboard** — tracks Player wins / Ties / Computer wins
- ✨ **Visual feedback** — progress ring on canvas + animated result card
- 📱 **Responsive** — works on desktop and mobile (HTTPS required)

---

## 🛠 Tools & Technologies

| Tool | Purpose |
|------|---------|
| **[MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer)** (`@mediapipe/tasks-vision@0.10.14`) | On-device ML gesture recognition — detects `Closed_Fist`, `Open_Palm`, `Victory` |
| **WebRTC `getUserMedia()`** | Accesses the device camera stream via the browser |
| **Canvas 2D API** | Draws a live progress ring while you hold a gesture |
| **Plain HTML / CSS / JS** | No frameworks, no build step — works directly on GitHub Pages |

---

## 📂 File Structure

```
rps-gesture-detector/
├── index.html   ← Page structure + MediaPipe CDN import
├── style.css    ← Dark glassmorphism design system + animations
├── script.js    ← MediaPipe setup, webcam, game logic
└── README.md    ← This file
```

---

## 🚀 Running Locally

Because `getUserMedia()` requires a **secure context**, you **cannot** open `index.html` directly as a `file://` URL.

**Option 1 — VS Code Live Server**
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` → **Open with Live Server**
3. Opens at `http://localhost:5500` — camera access works ✅

**Option 2 — Python HTTP server**
```bash
python -m http.server 8000
# Then open http://localhost:8000
```

**Option 3 — Node.js `serve`**
```bash
npx serve .
```

---

## 🌐 Deploying to GitHub Pages

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages** → set Source to `main` branch, `/ (root)`.
3. GitHub Pages serves over HTTPS — camera access works ✅

> **⚠️ Important**: Camera access via `getUserMedia()` only works over **HTTPS** or **localhost**.  
> Opening the file directly (e.g. `file:///index.html`) will block camera access in most browsers.

---

## 🎮 How to Play

1. Open the app (HTTPS or localhost)
2. Allow camera access when prompted
3. Wait for the green **"Model ready"** status
4. Show one of these gestures to the camera:
   - **✊ Closed fist** → Rock
   - **🖐 Open palm** → Paper
   - **✌️ Two fingers (V sign)** → Scissors
5. Hold the gesture steady for **1 second** — a purple progress ring will fill
6. Your move locks in → the computer reveals its move → result is shown!
7. Click **↺ Reset Score** to start a fresh game

---

## 🧠 How It Works

```
getUserMedia()
     │
     ▼
 <video> element  ──────────────────────────────────────────────────┐
     │                                                               │
     ▼                                                               │
GestureRecognizer.recognizeForVideo()  (every animation frame)      │
     │                                                               │
     ▼                                                               │
Gesture categoryName                                                 │
  ├─ "Closed_Fist" → Rock                                           │
  ├─ "Open_Palm"   → Paper                                          │
  ├─ "Victory"     → Scissors                                       │
  └─ (other)       → ignored                                        │
     │                                                               │
     ▼                                                               │
Hold ≥ 1 second? ──► playRound()                                    │
                          │                                          │
                          ├─ getComputerMove() → Math.random()      │
                          ├─ determineWinner()                       │
                          └─ update scoreboard + show result        ◄┘
                               (2.5 s cooldown before next round)
```

---

## 📋 Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome / Edge (desktop) | ✅ Full support |
| Firefox (desktop) | ✅ Full support |
| Safari 16+ | ✅ Full support |
| Chrome for Android | ✅ Works over HTTPS |
| iOS Safari | ⚠️ Camera may need HTTPS + user gesture |

---

## 📄 License

MIT — free to use and modify.