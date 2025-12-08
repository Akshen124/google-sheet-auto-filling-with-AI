import express from 'express';
import { autoFillGoogleForm } from '../services/playwright.mjs';

const router = express.Router();

router.post('/submit', async (req, res) => {
  const { formUrl } = req.body;
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: 'No access token found. Please log in first.' });
  }

  try {
    await autoFillGoogleForm(formUrl, accessToken);
    res.json({ success: true, message: 'Form processed successfully' });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Form processing failed' });
  }
});

export default router;