
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const FRUITS = [
    "🍎", "🍌", "🍇", "🥝", "🍓", "🍋",
    "🍒", "🍍", "🍉", "🥭", "🍑", "🍐",
    "🫐", "🍊", "🥥", "🍈", "🍏", "🍅"
  ];

  const DIFFICULTIES = {
    easy: { pairs: 8, columns: 4 },\
    
    medium: { pairs: 12, columns: 4 },
    hard: { pairs: 18, columns: 6 }
  };

  const DEFAULT_PLAYERS = [
    "Sarah_Dev",
    "RohanPlayz",
    "PixelQueen",
    "GameMaster",
    "NovaGamer"
  ];

  const el = {
    board: $("#gameBoard"),
    timer: $("#timer"),
    moves: $("#moves"),
    pairs: $("#pairs"),
    score: $("#score"),
    progressBar: $("#progressBar"),
    progressText: $("#progressText"),
    progressTrack: $("#progressTrack"),
    message: $("#gameMessage"),

    themeToggle: $("#themeToggle"),
    soundToggle: $("#soundToggle"),
    startBtn: $("#startBtn"),
    pauseBtn: $("#pauseBtn"),
    restartBtn: $("#restartBtn"),
    resumeBtn: $("#resumeBtn"),

    pauseOverlay: $("#pauseOverlay"),
    winOverlay: $("#winOverlay"),
    nameOverlay: $("#nameOverlay"),
    nameForm: $("#nameForm"),
    nameInput: $("#nameInput"),
    skipNameBtn: $("#skipNameBtn"),
    changeName: $("#changeName"),

    playerLabel: $("#playerLabel"),
    playerAvatar: $("#playerAvatar"),
    playerStatus: $("#playerStatus"),

    winSummary: $("#winSummary"),
    winTime: $("#winTime"),
    winMoves: $("#winMoves"),
    winScore: $("#winScore"),
    playAgainBtn: $("#playAgainBtn"),
    closeWinBtn: $("#closeWinBtn"),

    leaderboard: $("#leaderboard"),
    toast: $("#toast")
  };

  let difficulty = "medium";
  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;
  let paused = false;
  let started = false;
  let finished = false;

  let moves = 0;
  let matchedPairs = 0;
  let score = 0;
  let seconds = 0;
  let timerInterval = null;
  let mismatchTimeout = null;
  let toastTimeout = null;
  let soundEnabled = true;
  let audioContext = null;

  let playerName = readStorage("mnx-player-name", "Guest Player");

  // Safely read saved browser settings.
  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // The game still works if browser storage is unavailable.
    }
  }

  function getSavedNames() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("mnx-player-names") || "[]"
      );

      if (Array.isArray(saved)) {
        return saved.filter(
          name => typeof name === "string" && name.trim()
        );
      }
    } catch {
      // Use default players if saved data is invalid.
    }

    return [];
  }

  function savePlayerName(name) {
    playerName = name.trim().slice(0, 24) || "Guest Player";

    writeStorage("mnx-player-name", playerName);

    const previousNames = getSavedNames();
    const names = [
      playerName,
      ...previousNames.filter(
        name => name.toLowerCase() !== playerName.toLowerCase()
      )
    ].slice(0, 5);

    writeStorage("mnx-player-names", JSON.stringify(names));

    renderPlayer();
    renderLeaderboard();
  }

  // Theme: restore the user's previous selection.
  function applyTheme(theme) {
    const dark = theme === "dark";

    document.body.classList.toggle("dark", dark);
    el.themeToggle.textContent = dark ? "☀️" : "🌙";

    el.themeToggle.setAttribute(
      "aria-label",
      dark ? "Switch to light mode" : "Switch to dark mode"
    );

    el.themeToggle.title = dark ? "Light mode" : "Dark mode";

    const metaTheme = document.querySelector(
      'meta[name="theme-color"]'
    );

    if (metaTheme) {
      metaTheme.content = dark ? "#0d1224" : "#eef7ff";
    }

    writeStorage("mnx-theme", theme);
  }

  el.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark")
      ? "light"
      : "dark";

    applyTheme(nextTheme);
    playSound("click");
  });

  // Sound effects use the browser's Web Audio API.
  function playSound(type) {
    
/* =====================================
   MEMORY NEXUS — AUDIO SYSTEM
   ===================================== */

const AudioManager = (() => {
  let context = null;
  let masterGain = null;
  let musicGain = null;
  let musicTimer = null;
  let musicStep = 0;

  let effectsEnabled = true;
  let musicEnabled = false;
  let volume = 0.35;

  const notes = [261.63, 329.63, 392.00, 440.00, 392.00, 329.63];

  function initialize() {
    if (context) {
      if (context.state === "suspended") {
        context.resume();
      }
      return;
    }

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      console.warn("Web Audio API is not supported.");
      return;
    }

    context = new AudioContextClass();

    masterGain = context.createGain();
    musicGain = context.createGain();

    masterGain.gain.value = volume;
    musicGain.gain.value = 0.12;

    masterGain.connect(context.destination);
    musicGain.connect(masterGain);
  }

  function tone(frequency, duration, type = "sine", level = 0.3) {
    if (!context || !effectsEnabled) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, level),
      now + 0.015
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration
    );

    oscillator.connect(gain);
    gain.connect(masterGain);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  function play(name) {
    initialize();
    if (!context || !effectsEnabled) return;

    switch (name) {
      case "start":
        tone(523.25, 0.12);
        setTimeout(() => tone(659.25, 0.15), 100);
        break;

      case "flip":
        tone(620, 0.07, "triangle", 0.18);
        break;

      case "match":
        tone(659.25, 0.13, "sine", 0.25);
        setTimeout(() => tone(783.99, 0.16, "sine", 0.25), 110);
        setTimeout(() => tone(987.77, 0.22, "sine", 0.22), 230);
        break;

      case "mismatch":
        tone(220, 0.14, "triangle", 0.2);
        setTimeout(() => tone(185, 0.16, "triangle", 0.16), 100);
        break;

      case "pause":
        tone(440, 0.12, "sine", 0.15);
        break;

      case "win":
        [523.25, 659.25, 783.99, 1046.5].forEach(
          (frequency, index) => {
            setTimeout(
              () => tone(frequency, 0.3, "sine", 0.22),
              index * 150
            );
          }
        );
        break;

      default:
        tone(440, 0.07);
    }
  }

  function playMusicNote() {
    if (!context || !musicEnabled || !musicGain) return;

    const frequency = notes[musicStep % notes.length];
    const now = context.currentTime;

    const oscillator = context.createOscillator();
    const noteGain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.exponentialRampToValueAtTime(0.07, now + 0.1);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    oscillator.connect(noteGain);
    noteGain.connect(musicGain);

    oscillator.start(now);
    oscillator.stop(now + 0.6);

    musicStep++;
  }

  function startMusic() {
    initialize();
    if (!context || musicTimer) return;

    musicEnabled = true;
    musicGain.gain.setTargetAtTime(0.12, context.currentTime, 0.1);

    playMusicNote();
    musicTimer = setInterval(playMusicNote, 650);
  }

  function stopMusic() {
    musicEnabled = false;

    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }

    if (context && musicGain) {
      musicGain.gain.setTargetAtTime(
        0.0001,
        context.currentTime,
        0.08
      );
    }
  }

  function toggleEffects() {
    effectsEnabled = !effectsEnabled;
    return effectsEnabled;
  }

  function toggleMusic() {
    if (musicEnabled) {
      stopMusic();
    } else {
      startMusic();
    }

    return musicEnabled;
  }

  function setVolume(value) {
    volume = Math.max(0, Math.min(1, Number(value) / 100));

    initialize();

    if (context && masterGain) {
      masterGain.gain.setTargetAtTime(
        volume,
        context.currentTime,
        0.03
      );
    }
  }

  return {
    initialize,
    play,
    startMusic,
    stopMusic,
    toggleEffects,
    toggleMusic,
    setVolume,
    get effectsEnabled() {
      return effectsEnabled;
    },
    get musicEnabled() {
      return musicEnabled;
    }
  };
})();

/* AUDIO CONTROL BUTTONS */

document.addEventListener("DOMContentLoaded", () => {
  const soundButton = document.getElementById("soundToggle");
  const musicButton = document.getElementById("musicToggle");
  const volumeSlider = document.getElementById("volumeControl");

  if (soundButton) {
    soundButton.addEventListener("click", () => {
      const enabled = AudioManager.toggleEffects();

      soundButton.textContent = enabled ? "🔊" : "🔇";
      soundButton.setAttribute(
        "aria-label",
        enabled ? "Mute sound effects" : "Enable sound effects"
      );

      if (enabled) AudioManager.play("start");
    });
  }

  if (musicButton) {
    musicButton.addEventListener("click", () => {
      AudioManager.initialize();

      const enabled = AudioManager.toggleMusic();

      musicButton.textContent = enabled ? "🎵" : "🎼";
      musicButton.setAttribute(
        "aria-label",
        enabled ? "Turn off background music" : "Turn on background music"
      );
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener("input", event => {
      AudioManager.setVolume(event.target.value);
    });
  }
});



    if (!soundEnabled) return;

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      if (!audioContext) {
        audioContext = new AudioContextClass();
      }

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const settings = {
        click: { frequency: 420, duration: 0.06 },
        flip: { frequency: 540, duration: 0.07 },
        match: { frequency: 760, duration: 0.15 },
        mismatch: { frequency: 230, duration: 0.12 },
        win: { frequency: 880, duration: 0.22 }
      };

      const sound = settings[type] || settings.click;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(sound.frequency, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + sound.duration
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(now);
      oscillator.stop(now + sound.duration + 0.02);
    } catch {
      // Audio is optional; gameplay does not depend on it.
    }
  }

  el.soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    el.soundToggle.textContent = soundEnabled ? "🔊" : "🔇";
    el.soundToggle.setAttribute(
      "aria-label",
      soundEnabled ? "Mute sound" : "Enable sound"
    );

    if (soundEnabled) playSound("click");

    showToast(soundEnabled ? "Sound enabled" : "Sound muted");
  });

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(remainingSeconds).padStart(2, "0")
    );
  }

  function updateTimerDisplay() {
    el.timer.textContent = formatTime(seconds);
  }

  function startTimer() {
    if (timerInterval || paused || finished || !started) return;

    timerInterval = window.setInterval(() => {
      if (!paused && !finished) {
        seconds++;
        updateTimerDisplay();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateStats() {
    const totalPairs = DIFFICULTIES[difficulty].pairs;
    const percentage = Math.round((matchedPairs / totalPairs) * 100);

    el.moves.textContent = String(moves);
    el.pairs.textContent = `${matchedPairs} / ${totalPairs}`;
    el.score.textContent = String(score);

    el.progressBar.style.width = `${percentage}%`;
    el.progressText.textContent = `${percentage}%`;
    el.progressTrack.setAttribute("aria-valuenow", String(percentage));
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = window.setTimeout(() => {
      el.toast.classList.remove("show");
    }, 2200);
  }

  function setMessage(message) {
    el.message.textContent = message;
  }

  function shuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[j]] = [
        shuffled[j],
        shuffled[i]
      ];
    }

    return shuffled;
  }

  // Create cards with the logo on the hidden side.
  function createCard(fruit, index) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "memory-card";
    card.dataset.fruit = fruit;
    card.dataset.index = String(index);
    card.setAttribute("aria-label", `Hidden card ${index + 1}`);
    card.setAttribute("aria-pressed", "false");

    card.innerHTML = `
      <span class="card-inner">
        <span class="card-face card-back" aria-hidden="true">
          <span class="card-logo">🧠</span>
        </span>
        <span class="card-face card-front" aria-hidden="true">
          <span class="fruit-emoji">${fruit}</span>
        </span>
      </span>
    `;

    card.addEventListener("click", () => handleCardClick(card));

    return card;
  }

  function renderBoard() {
    const config = DIFFICULTIES[difficulty];
    const selectedFruits = FRUITS.slice(0, config.pairs);
    const deck = shuffle([...selectedFruits, ...selectedFruits]);

    el.board.innerHTML = "";
    el.board.style.setProperty("--columns", config.columns);

    deck.forEach((fruit, index) => {
      el.board.appendChild(createCard(fruit, index));
    });
  }

  function handleCardClick(card) {
    if (
      paused ||
      finished ||
      lockBoard ||
      card.classList.contains("flipped") ||
      card.classList.contains("matched")
    ) {
      return;
    }

    if (!started) {
      started = true;
      startTimer();
      setMessage("Game started! Find your first matching pair.");
    }

    card.classList.add("flipped");
    card.setAttribute("aria-pressed", "true");
    card.setAttribute("aria-label", `Revealed fruit ${card.dataset.fruit}`);

    playSound("flip");

    if (!firstCard) {
      firstCard = card;
      return;
    }

    secondCard = card;
    moves++;

    updateStats();
    checkForMatch();
  }

  function checkForMatch() {
    if (!firstCard || !secondCard) return;

    lockBoard = true;

    const isMatch = firstCard.dataset.fruit === secondCard.dataset.fruit;

    if (isMatch) {
      firstCard.classList.add("matched");
      secondCard.classList.add("matched");

      firstCard.setAttribute("aria-label", "Matched fruit");
      secondCard.setAttribute("aria-label", "Matched fruit");

      firstCard.disabled = true;
      secondCard.disabled = true;

      matchedPairs++;

      // A simple game score: matches reward points;
      // extra moves and elapsed time do not change the leaderboard.
      score += 100;

      updateStats();
      playSound("match");

      setMessage(
        matchedPairs === DIFFICULTIES[difficulty].pairs
          ? "Every pair found! Great memory."
          : "Perfect match! Find another pair."
      );

      resetSelection();

      if (matchedPairs === DIFFICULTIES[difficulty].pairs) {
        finishGame();
      }
    } else {
      setMessage("Not a match. Remember their positions!");

      mismatchTimeout = window.setTimeout(() => {
        if (firstCard) {
          firstCard.classList.remove("flipped");
          firstCard.setAttribute("aria-pressed", "false");
          firstCard.setAttribute(
            "aria-label",
            `Hidden card ${Number(firstCard.dataset.index) + 1}`
          );
        }

        if (secondCard) {
          secondCard.classList.remove("flipped");
          secondCard.setAttribute("aria-pressed", "false");
          secondCard.setAttribute(
            "aria-label",
            `Hidden card ${Number(secondCard.dataset.index) + 1}`
          );
        }

        playSound("mismatch");
        resetSelection();
        setMessage("Try again. Remember where each fruit appeared.");
      }, 850);
    }
  }

  function resetSelection() {
    firstCard = null;
    secondCard = null;
    lockBoard = false;
  }

  function resetGame() {
    stopTimer();

    if (mismatchTimeout !== null) {
      clearTimeout(mismatchTimeout);
      mismatchTimeout = null;
    }

    firstCard = null;
    secondCard = null;
    lockBoard = false;
    paused = false;
    started = false;
    finished = false;

    moves = 0;
    matchedPairs = 0;
    score = 0;
    seconds = 0;

    el.pauseOverlay.classList.add("hidden");
    el.winOverlay.classList.add("hidden");
    el.pauseBtn.textContent = "Ⅱ Pause";
    el.pauseBtn.disabled = false;

    $$(".segmented button").forEach(button => {
      button.disabled = false;
      button.classList.toggle(
        "active",
        button.dataset.difficulty === difficulty
      );
    });

    updateTimerDisplay();
    updateStats();
    renderBoard();

    setMessage(
      `${DIFFICULTIES[difficulty].pairs} pairs are waiting. Find them all!`
    );

    el.playerStatus.textContent = "Ready for a new challenge";
  }

  function finishGame() {
    finished = true;
    stopTimer();

    el.winTime.textContent = formatTime(seconds);
    el.winMoves.textContent = String(moves);
    el.winScore.textContent = String(score);

    el.winSummary.textContent =
      `${playerName}, you matched all ${matchedPairs} pairs ` +
      `in ${formatTime(seconds)} with ${moves} moves!`;

    el.playerStatus.textContent = "Challenge completed!";

    el.winOverlay.classList.remove("hidden");
    playSound("win");
  }

  function pauseGame() {
    if (paused || finished) return;

    paused = true;
    stopTimer();

    el.pauseOverlay.classList.remove("hidden");
    el.pauseBtn.textContent = "▶ Resume";
    setMessage("Game paused. Resume when you're ready.");
  }

  function resumeGame() {
    if (!paused || finished) return;

    paused = false;
    el.pauseOverlay.classList.add("hidden");
    el.pauseBtn.textContent = "Ⅱ Pause";

    if (started) startTimer();

    setMessage("Welcome back! Continue finding the pairs.");
  }

  // Difficulty selection starts a fresh board.
  $$("[data-difficulty]").forEach(button => {
    button.addEventListener("click", () => {
      const selected = button.dataset.difficulty;

      if (!DIFFICULTIES[selected]) return;

      difficulty = selected;
      resetGame();

      playSound("click");
      showToast(`${selected[0].toUpperCase() + selected.slice(1)} mode selected`);
    });
  });

  el.startBtn.addEventListener("click", () => {
    if (finished) {
      resetGame();
    }

    if (paused) {
      resumeGame();
    }

    started = true;
    startTimer();

    setMessage("Game started! Flip two cards to find a match.");
    el.board.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  el.pauseBtn.addEventListener("click", () => {
    if (paused) {
      resumeGame();
    } else {
      pauseGame();
    }
  });

  el.resumeBtn.addEventListener("click", resumeGame);

  el.restartBtn.addEventListener("click", () => {
    resetGame();
    playSound("click");
    showToast("Game restarted");
  });

  el.playAgainBtn.addEventListener("click", () => {
    resetGame();
    playSound("click");
  });

  el.closeWinBtn.addEventListener("click", () => {
    el.winOverlay.classList.add("hidden");
  });

  // Player profile.
  function renderPlayer() {
    el.playerLabel.textContent = playerName;

    const initials = playerName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join("");

    el.playerAvatar.textContent = initials || "G";
  }

  function renderLeaderboard() {
    const savedNames = getSavedNames();

    const names = [
      ...savedNames,
      ...DEFAULT_PLAYERS.filter(
        name => !savedNames.some(
          saved => saved.toLowerCase() === name.toLowerCase()
        )
      )
    ].slice(0, 5);

    el.leaderboard.innerHTML = "";

    names.forEach(name => {
      const item = document.createElement("li");
      const avatar = document.createElement("span");
      const label = document.createElement("span");

      avatar.className = "leader-avatar";
      avatar.textContent = name
        .split(/[_\s-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join("") || "P";

      label.className = "leader-name";
      label.textContent = name;

      item.append(avatar, label);
      el.leaderboard.appendChild(item);
    });
  }

  function openNameDialog() {
    el.nameInput.value = playerName === "Guest Player" ? "" : playerName;
    el.nameOverlay.classList.remove("hidden");
    el.nameInput.focus();
  }

  el.changeName.addEventListener("click", openNameDialog);

  el.nameForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = el.nameInput.value.trim();

    if (!name) {
      showToast("Please enter a player name");
      el.nameInput.focus();
      return;
    }

    savePlayerName(name);
    el.nameOverlay.classList.add("hidden");
    showToast(`Welcome, ${playerName}!`);
  });

  el.skipNameBtn.addEventListener("click", () => {
    el.nameOverlay.classList.add("hidden");
  });

  // Escape closes dialogs where safe; it doesn't resume a paused game.
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    if (!el.nameOverlay.classList.contains("hidden")) {
      el.nameOverlay.classList.add("hidden");
    } else if (!el.winOverlay.classList.contains("hidden")) {
      el.winOverlay.classList.add("hidden");
    }
  });

  // Initial setup.
  applyTheme(readStorage("mnx-theme", "light"));
  renderPlayer();
  renderLeaderboard();
  resetGame();

  // First-time visitors can set a name or continue as a guest.
  if (!readStorage("mnx-player-name", "")) {
    openNameDialog();
  }
});

const musicButton = document.getElementById("musicToggle");

let musicContext;
let musicPlaying = false;
let musicTimer = null;
let musicStep = 0;

let musicMaster;

const melody = [
  523.25, 659.25, 783.99, 659.25,
  587.33, 698.46, 880.00, 698.46,
  523.25, 659.25, 783.99, 1046.50,
  880.00, 783.99, 659.25, 587.33
];

function setupMusic() {
  if (!musicContext) {
    musicContext = new (window.AudioContext || window.webkitAudioContext)();

    musicMaster = musicContext.createGain();
    musicMaster.gain.value = 0.12;
    musicMaster.connect(musicContext.destination);
  }
}

function playInstrumentNote(frequency, startTime, duration, type = "sine", volume = 0.3) {
  const oscillator = musicContext.createOscillator();
  const gain = musicContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(musicMaster);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);
}

function playMusicStep() {
  if (!musicPlaying || !musicContext) return;

  const now = musicContext.currentTime;
  const note = melody[musicStep % melody.length];

  // Soft bell-like melody
  playInstrumentNote(note, now, 0.65, "sine", 0.22);

  // Gentle piano-like lower note
  if (musicStep % 2 === 0) {
    playInstrumentNote(note / 2, now, 0.9, "triangle", 0.12);
  }

  // Ambient background harmony
  if (musicStep % 4 === 0) {
    playInstrumentNote(note / 4, now, 1.4, "sine", 0.08);
  }

  musicStep++;
}

async function startGameMusic() {
  setupMusic();

  if (musicContext.state === "suspended") {
    await musicContext.resume();
  }

  if (musicPlaying) return;

  musicPlaying = true;
  musicButton.textContent = "🎵 Music On";
  musicButton.setAttribute("aria-pressed", "true");

  playMusicStep();
  musicTimer = setInterval(playMusicStep, 550);
}

function stopGameMusic() {
  musicPlaying = false;

  if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }

  musicButton.textContent = "🎵 Music Off";
  musicButton.setAttribute("aria-pressed", "false");
}

musicButton.addEventListener("click", async () => {
  if (musicPlaying) {
    stopGameMusic();
  } else {
    await startGameMusic();
  }
});

