import React, { useState } from 'react';
import axios from 'axios';

const FormInput = () => {
  const [formUrl, setFormUrl] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async () => {
    if (!formUrl.startsWith('https://docs.google.com/forms/')) {
      setStatus('❌ Invalid Google Form link');
      return;
    }

    try {
      setStatus('⏳ Processing...');
      const res = await axios.post(
        'http://localhost:5000/form/submit',
        { formUrl },
        { withCredentials: true } // ✅ Send session cookie
      );

      if (res.data.success) {
        setStatus('✅ Form filled successfully!');
      } else {
        setStatus('⚠️ Something went wrong.');
      }
    } catch (err) {
      console.error(err);
      setStatus('❌ Error: ' + (err.response?.data?.error || 'Server error'));
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🧠 AI Form Filler</h2>
      <input
        type="text"
        placeholder="Paste your Google Form link"
        value={formUrl}
        onChange={(e) => setFormUrl(e.target.value)}
        style={{ width: '80%', padding: '0.5rem', fontSize: '1rem' }}
      />
      <button onClick={handleSubmit} style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}>
        Submit
      </button>
      <p>{status}</p>
    </div>
  );
};

export default FormInput;