const axios = require('axios');

async function generateAnswers(questions) {
  const prompt = questions.map(q => `Q: ${q.label}`).join('\n');
  const response = await axios.post('http://localhost:11434/api/generate', {
    model: 'mistral',
    prompt: `Answer the following questions briefly:\n${prompt}`,
    stream: false
  });

  const raw = response.data.response;
  const lines = raw.split('\n').filter(Boolean);
  return questions.map((q, i) => ({ ...q, answer: lines[i] || '' }));
}

module.exports = { generateAnswers };