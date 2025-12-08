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

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('🧪 CLIENT_ID:', process.env.CLIENT_ID);
console.log('🧪 CLIENT_SECRET:', process.env.CLIENT_SECRET);

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();

// ✅ CORS setup
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// ✅ Session setup
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

// ✅ JSON body parser
app.use(express.json());

// ✅ Static files
app.use(express.static(path.join(__dirname, '../public')));

// ✅ Google OAuth setup
setupGoogleAuth(app);

// ✅ Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ✅ Form route after login
app.get('/form', (req, res) => {
  const token = req.session.token || req.session.accessToken;
  if (!token) {
    return res.status(401).send('❌ Not logged in');
  }
  res.send(`✅ Logged in! Access token: ${token}`);
});

// ✅ Manual OAuth callback
app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('❌ No code received from Google');

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: 'http://localhost:5000/oauth/callback',
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('❌ Token exchange failed:', tokenData);
      return res.status(400).send('Token exchange failed');
    }

    req.session.accessToken = accessToken;
    console.log('🔐 Saving token to session:', accessToken);
    console.log('🔐 Session after saving:', req.session);
    console.log('🔑 Token Data:', tokenData);

    res.redirect('http://localhost:3000');
  } catch (err) {
    console.error('❌ Error exchanging code for token:', err);
    res.status(500).send('Something went wrong during OAuth');
  }
});

// ✅ Autofill route
app.post('/form/submit', async (req, res) => {
  const { formUrl } = req.body;
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: '❌ No access token found. Please log in first.' });
  }

  if (!formUrl || !formUrl.startsWith('https://docs.google.com/forms')) {
    return res.status(400).json({ error: '❌ Invalid or missing form URL.' });
  }

  try {
    await autoFillGoogleForm(formUrl, accessToken);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Autofill error:', err);
    res.status(500).json({ error: 'Something went wrong while autofilling the form.' });
  }
});

// ✅ Additional routes
app.use('/form', formRoutes);

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/debug/session', (req, res) => {
  res.json({ accessToken: req.session.accessToken || null });
});

// ✅ Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});