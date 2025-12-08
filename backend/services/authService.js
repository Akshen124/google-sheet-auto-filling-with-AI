import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import session from 'express-session';

export function setupGoogleAuth(app) {
  app.use(session({
    secret: 'your-sedd03f0035bd218ddf7f436dad039da548434da1d312f03d01beea51a3455ca0dcret-key',
    resave: false,
    saveUninitialized: true
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  passport.use(new GoogleStrategy({
    clientID: '93045755520-j32ok5v3u5qh3mf9hpqi6nhefdmakdvr.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:5000/oauth/callback'
  }, (accessToken, refreshToken, profile, done) => {
    profile.accessToken = accessToken;
    return done(null, profile);
  }));

  app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      req.session.token = req.user.accessToken;
      res.redirect('/form');
    }
  );
}