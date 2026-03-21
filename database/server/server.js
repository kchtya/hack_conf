const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(require('cors')());

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, phone, password } = req.body;
  if (!firstName || !lastName || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (first_name, last_name, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
      [firstName, lastName, phone, hashedPassword]
    );
    const userId = result.rows[0].id;
    await pool.query(
      'INSERT INTO player_stats (user_id) VALUES ($1)',
      [userId]
    );
    res.status(201).json({ userId, message: 'User registered' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Phone already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password required' });
  }
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, password_hash FROM users WHERE phone = $1',
      [phone]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = jwt.sign({ userId: user.id, phone }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: user.id, firstName: user.first_name, lastName: user.last_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Сохранение результата игры
app.post('/api/game/result', authenticateToken, async (req, res) => {
  const { score, kills } = req.body;
  const userId = req.user.userId;
  if (score === undefined || kills === undefined) {
    return res.status(400).json({ error: 'Score and kills required' });
  }
  try {
    await pool.query(
      'INSERT INTO leaderboard (user_id, score, kills) VALUES ($1, $2, $3)',
      [userId, score, kills]
    );
    const stats = await pool.query(
      'SELECT high_score, total_kills, games_played FROM player_stats WHERE user_id = $1',
      [userId]
    );
    const oldHighScore = stats.rows[0]?.high_score || 0;
    const newHighScore = score > oldHighScore;
    await pool.query(
      `UPDATE player_stats 
       SET high_score = GREATEST(high_score, $1),
           total_kills = total_kills + $2,
           games_played = games_played + 1,
           last_game_date = NOW()
       WHERE user_id = $3`,
      [score, kills, userId]
    );
    res.json({ message: 'Result saved', isNewHighScore: newHighScore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Турнирная таблица (топ-100)
app.get('/api/leaderboard', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 100);
  try {
    const result = await pool.query(
      `SELECT ROW_NUMBER() OVER (ORDER BY l.score DESC) AS rank,
              u.id AS user_id,
              u.first_name,
              u.last_name,
              l.score,
              l.kills,
              l.game_date
       FROM leaderboard l
       JOIN users u ON l.user_id = u.id
       ORDER BY l.score DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Статистика текущего игрока
app.get('/api/player/stats', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      'SELECT high_score, total_kills, games_played, last_game_date FROM player_stats WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stats not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});