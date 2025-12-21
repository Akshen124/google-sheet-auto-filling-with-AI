import express from 'express';
import session from 'express-session';
import fetch from 'node-fetch';
import path from 'path';
import dotenv from 'dotenv';
import formRoutes from './routes/formRoutes.js';
import autoFillGoogleForm from './utils/autoFillGoogleForm.js';

dotenv.config();

const app = express();

// -------------------- MIDDLEWARE --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,        // Render uses HTTPS
      sameSite: 'lax'
    }
  })
);

// -------------------- GOOGLE OAUTH --------------------

// 👉 STEP 1: Authorization (THIS WAS MISSING BEFORE)
app.get('/auth/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.redirect(authUrl);
});

// 👉 STEP 2: Callback (your logic – corrected & kept)
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
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error(tokenData);
      return res.status(400).send('❌ Token exchange failed');
    }

    // Save token in session
    req.session.accessToken = tokenData.access_token;

    // Redirect back to frontend
    res.redirect(process.env.FRONTEND_URL);

  } catch (err) {
    console.error(err);
    res.status(500).send('❌ OAuth failed');
  }
});

// -------------------- APP ROUTES --------------------

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.get('/form', (req, res) => {
  if (!req.session.accessToken)
    return res.status(401).send('❌ Not logged in');

  res.send('✅ Logged in successfully');
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
    console.error(err);
    res.status(500).json({ error: 'Autofill failed' });
  }
});

app.use('/form', formRoutes);

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// -------------------- SERVER --------------------

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
