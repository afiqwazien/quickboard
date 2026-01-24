import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { kv } from '@vercel/kv';

const app = express();
const SECRET_KEY = process.env.SECRET_KEY || 'default-secret-key'; // We will set this in Vercel settings

app.use(cors());
app.use(express.json());

// --- Middleware: Verify Token ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Auth Routes ---
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  // KV: Get users list (or empty array)
  const users = (await kv.get('users')) || [];

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now().toString(), username, password: hashedPassword };

  users.push(newUser);
  
  // KV: Save updated list
  await kv.set('users', users);

  res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  // KV: Get users
  const users = (await kv.get('users')) || [];
  const user = users.find(u => u.username === username);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
  res.json({ token, username: user.username });
});

// --- Board Routes ---
const initialData = {
  columns: {
    'col-1': { id: 'col-1', title: 'To Do', items: [] },
    'col-2': { id: 'col-2', title: 'Doing', items: [] },
    'col-3': { id: 'col-3', title: 'Done', items: [] },
  },
  columnOrder: ['col-1', 'col-2', 'col-3'],
};

app.get('/api/board', authenticateToken, async (req, res) => {
  // KV: Get specific user board
  const data = await kv.get(`board-${req.user.id}`);
  
  if (!data) {
    // If no data, save initial data to KV and return it
    await kv.set(`board-${req.user.id}`, initialData);
    res.json(initialData);
  } else {
    res.json(data);
  }
});

app.post('/api/board', authenticateToken, async (req, res) => {
  try {
    // KV: Save user board
    await kv.set(`board-${req.user.id}`, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Export for Vercel Serverless
export default app;