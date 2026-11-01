const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'memory_game.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL CHECK(length(player_name) BETWEEN 2 AND 24),
    difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
    moves INTEGER NOT NULL,
    seconds INTEGER NOT NULL,
    score INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_scores_difficulty_score ON scores(difficulty, score DESC);
`);

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const validDifficulty = new Set(['easy', 'medium', 'hard']);

function sanitizeName(name) {
  return String(name || '')
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 24);
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'memory-card-game' });
});

app.get('/api/leaderboard', (req, res) => {
  const difficulty = String(req.query.difficulty || 'medium').toLowerCase();
  if (!validDifficulty.has(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty.' });
  }

  const rows = db.prepare(`
    SELECT player_name AS playerName, difficulty, moves, seconds, score,
           strftime('%Y-%m-%d %H:%M:%S', created_at) AS createdAt
    FROM scores
    WHERE difficulty = ?
    ORDER BY score DESC, seconds ASC, moves ASC
    LIMIT 10
  `).all(difficulty);

  res.json(rows);
});

app.post('/api/scores', (req, res) => {
  const playerName = sanitizeName(req.body.playerName);
  const difficulty = String(req.body.difficulty || '').toLowerCase();
  const moves = Number(req.body.moves);
  const seconds = Number(req.body.seconds);
  if (playerName.length < 2) {
    return res.status(400).json({ error: 'Player name must be 2–24 characters.' });
  }
  if (!validDifficulty.has(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty.' });
  }
  if (!Number.isInteger(moves) || moves < 1 || moves > 9999) {
    return res.status(400).json({ error: 'Invalid moves value.' });
  }
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 86400) {
    return res.status(400).json({ error: 'Invalid time value.' });
  }
  const config = { easy: { pairs: 4, multiplier: 1 }, medium: { pairs: 6, multiplier: 1.35 }, hard: { pairs: 9, multiplier: 1.8 } }[difficulty];
  const base = config.pairs * 1000 * config.multiplier;
  const efficiency = Math.max(0.28, 1 - Math.max(0, moves - config.pairs) / (config.pairs * 2.4));
  const timePenalty = Math.min(0.68, seconds / (config.pairs * 48));
  const score = Math.max(0, Math.round(base * efficiency * (1 - timePenalty)));

  const info = db.prepare(`
    INSERT INTO scores (player_name, difficulty, moves, seconds, score)
    VALUES (?, ?, ?, ?, ?)
  `).run(playerName, difficulty, moves, seconds, score);

  res.status(201).json({
    id: info.lastInsertRowid,
    playerName,
    difficulty,
    moves,
    seconds,
    score
  });
});

app.get('/api/stats', (req, res) => {
  const row = db.prepare(`
    SELECT
      COUNT(*) AS games,
      COALESCE(MAX(score), 0) AS topScore,
      COALESCE(ROUND(AVG(seconds), 0), 0) AS avgSeconds
    FROM scores
  `).get();

  res.json(row);
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Memory Card Game running at http://localhost:${PORT}`);
});
