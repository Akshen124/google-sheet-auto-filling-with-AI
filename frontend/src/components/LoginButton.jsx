// LoginButton.jsx
import React from 'react';

const LoginButton = () => {
  const handleLogin = () => {
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' +
      new URLSearchParams({
        client_id: '93045755520-j32ok5v3u5qh3mf9hpqi6nhefdmakdvr.apps.googleusercontent.com', // or use process.env.REACT_APP_CLIENT_ID
        redirect_uri: 'http://localhost:5000/oauth/callback',
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/userinfo.email',
        access_type: 'offline',
        prompt: 'consent'
      });
  };

  return (
    <button onClick={handleLogin} style={{ padding: '1rem', fontSize: '1rem' }}>
      🔐 Login with Google
    </button>
  );
};

export default LoginButton;