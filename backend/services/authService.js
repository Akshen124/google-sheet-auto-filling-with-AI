export function setupGoogleAuth(app) {
  app.get('/auth/google', (req, res) => {

    console.log('CLIENT_ID FROM ENV:', process.env.CLIENT_ID);
    console.log('REDIRECT_URI FROM ENV:', process.env.REDIRECT_URI);

    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    res.redirect(googleAuthUrl);
  });
}
