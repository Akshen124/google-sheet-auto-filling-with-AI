import React from 'react';
import FormInput from './components/FormInput';
import LoginButton from './components/LoginButton'; // ✅ Correct name
function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>🚀 AI Form Filler</h1>
      <LoginButton />
      <hr style={{ margin: '2rem 0' }} />
      <FormInput />
    </div>
  );
}

export default App;
