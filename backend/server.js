import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import formRoutes from './routes/form.js';
import { autoFillGoogleForm } from './services/playwright.mjs';
import { setupGoogleAuth } from './services/authService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();

// ✅ CORS (production safe)
app.use(cors({
  origin: true,
  credentials: true
}));

// ✅ Session
app.use(session({
  secret: process.env.CLIENT_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Google OAuth
setupGoogleAuth(app);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/form', (req, res) => {
  const token = req.session.token || req.session.accessToken;
  if (!token) return res.status(401).send('❌ Not logged in');
  res.send('✅ Logged in successfully');
});

app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('❌ No code received');

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) return res.status(400).send('Token exchange failed');

    req.session.accessToken = accessToken;
    res.redirect(process.env.FRONTEND_URL);

  } catch (err) {
    console.error(err);
    res.status(500).send('OAuth failed');
  }
});

app.post('/form/submit', async (req, res) => {
  const { formUrl } = req.body;
  const accessToken = req.session.accessToken;

  if (!accessToken)
    return res.status(401).json({ error: 'Not logged in' });

  try {
    await autoFillGoogleForm(formUrl, accessToken);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Autofill failed' });
  }
});

app.use('/form', formRoutes);

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
