/**
 * script.js — RPS Gesture Detector
 * Uses MediaPipe Tasks Vision GestureRecognizer (loaded via CDN ES module)
 * to detect Rock / Paper / Scissors hand gestures in real time,
 * then plays a simple random-computer-move game.
 */

// ─── MediaPipe CDN URL ───────────────────────────────────────────────────────
const MEDIAPIPE_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// Pre-trained gesture recognizer model hosted by Google
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

// ─── Gesture → RPS mapping ────────────────────────────────────────────────────
const GESTURE_MAP = {
  Closed_Fist: { label: "Rock",     emoji: "✊" },
  Open_Palm:   { label: "Paper",    emoji: "🖐" },
  Victory:     { label: "Scissors", emoji: "✌️" },
};

const RPS_MOVES = ["Rock", "Paper", "Scissors"];
const MOVE_EMOJI = { Rock: "✊", Paper: "🖐", Scissors: "✌️" };

// ─── Win-table: MOVE_WINS_AGAINST[m] = move that m beats ─────────────────────
const MOVE_WINS_AGAINST = {
  Rock:     "Scissors",
  Scissors: "Paper",
  Paper:    "Rock",
};

// ─── DOM references ───────────────────────────────────────────────────────────
const video          = document.getElementById("webcam");
const canvas         = document.getElementById("overlay-canvas");
const ctx            = canvas.getContext("2d");
const statusBar      = document.getElementById("status-bar");
const statusText     = document.getElementById("status-text");
const detectedText   = document.getElementById("detected-text");
const gestureBadge   = document.getElementById("gesture-badge");
const gestureEmoji   = document.getElementById("gesture-emoji");
const gestureLabel   = document.getElementById("gesture-label");
const computerEmoji  = document.getElementById("computer-emoji");
const computerMove   = document.getElementById("computer-move");
const resultBox      = document.getElementById("result-box");
const resultIcon     = document.getElementById("result-icon");
const resultText     = document.getElementById("result-text");
const scorePlayer    = document.getElementById("score-player");
const scoreTie       = document.getElementById("score-tie");
const scoreComputer  = document.getElementById("score-computer");
const resetBtn       = document.getElementById("reset-btn");

// ─── State ────────────────────────────────────────────────────────────────────
const score = { player: 0, tie: 0, computer: 0 };

let gestureRecognizer = null;
let lastVideoTime     = -1;

// Gesture lock-in logic: hold for HOLD_MS before triggering a game round
const HOLD_MS         = 1000;
const COOLDOWN_MS     = 2500; // pause between rounds
let holdStart         = null;
let currentGesture    = null; // gesture currently being held
let inCooldown        = false;
let holdTimer         = null;

// ─── Status helpers ───────────────────────────────────────────────────────────
function setStatus(type, message) {
  statusBar.className = `status-bar status-${type}`;
  statusText.textContent = message;
}

// ─── Score helpers ────────────────────────────────────────────────────────────
function bumpScore(el) {
  el.classList.remove("bump");
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add("bump");
  el.addEventListener("animationend", () => el.classList.remove("bump"), { once: true });
}

function updateScoreUI() {
  scorePlayer.textContent   = score.player;
  scoreTie.textContent      = score.tie;
  scoreComputer.textContent = score.computer;
}

// ─── Computer move ─────────────────────────────────────────────────────────────
function getComputerMove() {
  return RPS_MOVES[Math.floor(Math.random() * RPS_MOVES.length)];
}

// ─── Determine outcome ─────────────────────────────────────────────────────────
function determineWinner(playerMove, compMove) {
  if (playerMove === compMove) return "tie";
  return MOVE_WINS_AGAINST[playerMove] === compMove ? "player" : "computer";
}

// ─── Play a round ─────────────────────────────────────────────────────────────
function playRound(playerMove) {
  inCooldown = true;

  const compMove = getComputerMove();
  const outcome  = determineWinner(playerMove, compMove);

  // Update computer display
  computerEmoji.classList.remove("pop");
  void computerEmoji.offsetWidth;
  computerEmoji.textContent  = MOVE_EMOJI[compMove];
  computerEmoji.classList.add("pop");
  computerMove.textContent   = compMove;

  // Update result
  resultBox.classList.remove("hidden");
  resultText.className = "result-text";

  if (outcome === "tie") {
    resultIcon.textContent  = "🤝";
    resultText.textContent  = "It's a Tie!";
    resultText.classList.add("tie");
    score.tie++;
    bumpScore(scoreTie);
  } else if (outcome === "player") {
    resultIcon.textContent  = "🏆";
    resultText.textContent  = "You Win!";
    resultText.classList.add("win");
    score.player++;
    bumpScore(scorePlayer);
  } else {
    resultIcon.textContent  = "💻";
    resultText.textContent  = "Computer Wins!";
    resultText.classList.add("lose");
    score.computer++;
    bumpScore(scoreComputer);
  }

  updateScoreUI();

  // End cooldown after COOLDOWN_MS
  setTimeout(() => {
    inCooldown    = false;
    holdStart     = null;
    currentGesture = null;
    resultBox.classList.add("hidden");
    computerEmoji.textContent = "❓";
    computerMove.textContent  = "Waiting…";
  }, COOLDOWN_MS);
}

// ─── Process one detected gesture ─────────────────────────────────────────────
function handleGesture(detectedName) {
  const mapped = GESTURE_MAP[detectedName];

  if (!mapped) {
    // Not an RPS gesture — clear hold state
    gestureLabel.textContent = "";
    gestureEmoji.textContent = "";
    gestureBadge.classList.add("hidden");
    detectedText.textContent = "—";
    holdStart      = null;
    currentGesture = null;
    return;
  }

  // Show badge
  gestureBadge.classList.remove("hidden");
  gestureEmoji.textContent = mapped.emoji;
  gestureLabel.textContent = mapped.label;
  detectedText.textContent = mapped.label;

  if (inCooldown) return;

  // Track hold
  if (currentGesture !== mapped.label) {
    // New gesture
    currentGesture = mapped.label;
    holdStart      = performance.now();
  } else {
    // Same gesture — check if held long enough
    const held = performance.now() - holdStart;
    if (held >= HOLD_MS) {
      playRound(mapped.label);
    }
  }
}

// ─── Prediction loop ──────────────────────────────────────────────────────────
function predictWebcam() {
  // Sync canvas size to video
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;

    const results = gestureRecognizer.recognizeForVideo(video, Date.now());

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.gestures && results.gestures.length > 0) {
      // Take top gesture from first hand
      const topGesture = results.gestures[0][0];
      handleGesture(topGesture.categoryName);

      // Draw a subtle progress arc if holding
      if (currentGesture && holdStart && !inCooldown) {
        const progress = Math.min(1, (performance.now() - holdStart) / HOLD_MS);
        drawProgressRing(progress);
      }
    } else {
      handleGesture(null);
    }
  }

  requestAnimationFrame(predictWebcam);
}

// ─── Progress ring drawn on canvas ───────────────────────────────────────────
function drawProgressRing(progress) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r  = Math.min(canvas.width, canvas.height) * 0.42;
  const startAngle = -Math.PI / 2;
  const endAngle   = startAngle + 2 * Math.PI * progress;

  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = progress >= 1 ? "#4ade80" : "#7c6ff7";
  ctx.lineWidth   = 5;
  ctx.lineCap     = "round";
  ctx.shadowColor = progress >= 1 ? "#4ade80" : "#7c6ff7";
  ctx.shadowBlur  = 12;
  ctx.stroke();
  ctx.shadowBlur  = 0;
}

// ─── Init MediaPipe ────────────────────────────────────────────────────────────
async function initMediaPipe() {
  try {
    setStatus("loading", "Loading MediaPipe model…");

    // Dynamic import of the CDN bundle (ES module)
    const vision = await import(MEDIAPIPE_CDN);
    const { GestureRecognizer, FilesetResolver } = vision;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    gestureRecognizer = await GestureRecognizer.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 1,
    });

    setStatus("loading", "Requesting camera access…");
    await startCamera();
  } catch (err) {
    console.error(err);
    setStatus("error", `Error: ${err.message}`);
  }
}

// ─── Camera ────────────────────────────────────────────────────────────────────
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });

    video.srcObject = stream;

    video.addEventListener("loadeddata", () => {
      setStatus("ready", "Model ready — show your hand!");
      requestAnimationFrame(predictWebcam);
    });
  } catch (err) {
    if (err.name === "NotAllowedError") {
      setStatus("error", "Camera permission denied. Please allow camera access.");
    } else {
      setStatus("error", `Camera error: ${err.message}`);
    }
    throw err;
  }
}

// ─── Reset ─────────────────────────────────────────────────────────────────────
resetBtn.addEventListener("click", () => {
  score.player   = 0;
  score.tie      = 0;
  score.computer = 0;
  updateScoreUI();
  resultBox.classList.add("hidden");
  computerEmoji.textContent = "❓";
  computerMove.textContent  = "Waiting…";
  inCooldown     = false;
  holdStart      = null;
  currentGesture = null;
});

// ─── Boot ──────────────────────────────────────────────────────────────────────
initMediaPipe();
