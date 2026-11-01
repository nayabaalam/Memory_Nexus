# Memory Vault — Full-Stack Memory Card Game

A professional responsive memory-card game built with:

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js + Express
- **Database:** SQLite via better-sqlite3
- **Features:** Easy / Medium / Hard, timer, moves, score system, pause/resume, sound toggle, player name, leaderboard, persistent score storage.

## Run locally

1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npm start
```

4. Open `http://localhost:3000`.

The SQLite database is created automatically at `data/memory_game.db`.

## API

- `GET /api/health`
- `GET /api/leaderboard?difficulty=medium`
- `POST /api/scores`
- `GET /api/stats`

## Notes

The app intentionally uses vanilla HTML/CSS/JS for the UI so it is easy to study, customize, or migrate into React later.
