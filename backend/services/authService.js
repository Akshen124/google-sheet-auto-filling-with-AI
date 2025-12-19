// backend/services/authService.js

export function setupGoogleAuth(app) {
  /**
   * Step 1: Redirect user to Google OAuth
   */
  app.get('/auth/google', (req, res) => {
    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email',
      access_type: 'offline',
      prompt: 'consent'
    });

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    res.redirect(googleAuthUrl);
  });
}
