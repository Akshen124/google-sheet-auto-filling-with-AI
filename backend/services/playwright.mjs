import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// ✅ Ensure the public folder exists
const publicDir = path.join(__dirname, '../public');
await fs.promises.mkdir(publicDir, { recursive: true });

// ✅ Define the file path
const filePath = path.join(publicDir, 'something.txt');

// ✅ Write content (overwrites if file exists)
const content = 'This file was created by the autofill script.\n';
await fs.promises.writeFile(filePath, content, 'utf-8');

console.log('✅ something.txt created successfully');

// ✅ Dynamic fetch import (for later use)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
// ✅ Normalize answer options for matching
const normalize = str =>
  str
    .replace(/\u00A0/g, ' ')
    .replace(/[^\w₹/%\-&\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/(\d{1,2}):(\d{2})/g, (_, h, m) => `${h}${m}`) // convert 10:20 → 1020
    .toLowerCase()
    .trim();
// ✅ Define personal question filter
  const personalKeywords = ['name', 'whatsapp', 'department', 'year', 'email', 'phone'];
  const isPersonal = q => personalKeywords.some(k => q.toLowerCase().includes(k));
// ✅ Browser launcher helper using persistent Chrome profile
async function launchBrowser() {
  const userDataDir = 'C:\\Users\\Akshen\\AppData\\Local\\ai-form-profile';
  const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    executablePath,
    args: ['--start-maximized']
  });

  const page = await context.newPage();
  return { browser: context, page };
}
 // ✅ Main form automation function
async function autoFillGoogleForm(formUrl, accessToken) {
  const { browser, page } = await launchBrowser();

 

  // ✅ Step 1: Inject token into localStorage (optional)
  await page.addInitScript(token => {
    window.localStorage.setItem('access_token', token);
  }, accessToken);



  // ✅ Step 4: Open the form
  console.log('🌐 Navigating to the form...');

  await page.goto(formUrl, { waitUntil: 'domcontentloaded', timeout: 80000 });
  console.log('📄 Restricted form loaded');

  // 🔍 Detect restricted form
  const isRestricted = await page.$('input[type="email"]');
  if (isRestricted) {
    console.log('🔒 Restricted form detected. Ask user to sign in manually.');
    console.log('🛑 Waiting 30s for manual login...');
    await new Promise(res => setTimeout(res, 30000));
  } 
// ✅ Build questionOptionMap for aptitude questions
const questionOptionMap = {};
const items = await page.$$(`div[role="listitem"]`);

for (const item of items) {
  // ✅ Extract raw question text
  const rawQuestionText = await item.evaluate(el => {
    const lines = el.innerText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    const questionLine = lines.find(line =>
      /^[0-9]+\./.test(line) || /(\?|what|angle|clock|time|direction)/i.test(line)
    );

    const cleaned = questionLine || lines.find(line => !/^[A-Ea-e]\./.test(line)) || lines[0] || '';
    return cleaned.replace(/^[0-9]+\.\s*/, '').trim(); // ✅ Strip "1." or "10."
  });

  // ✅ NEW: Normalize the question for consistent matching
  const normalizedQuestion = normalize(rawQuestionText);

  // ✅ Log normalized question
  console.log(`🧠 Found question: ${normalizedQuestion}`);

  // ✅ Skip personal questions
  if (!normalizedQuestion || isPersonal(normalizedQuestion)) {
    console.log(`⚠️ Skipping personal or malformed question: ${normalizedQuestion}`);
    continue;
  }



  // ✅ Extract options from radios or dropdowns
  const options = await item.$$eval(
    `div[role="radio"], div[role="option"]`,
    els =>
      els
        .map(el => el.getAttribute('aria-label') || el.innerText.trim())
        .filter(Boolean)
  );

  if (options.length > 0) {
    questionOptionMap[normalize(rawQuestionText)] = options;

  } else {
    console.log(`⚠️ No options found for: ${rawQuestionText}`);
  }
}

// ✅ Log total extracted questions
console.log(`🧠 Extracted ${Object.keys(questionOptionMap).length} aptitude questions`);

// ✅ Build questionNumberMap from questionOptionMap
const questionNumberMap = {};
Object.entries(questionOptionMap).forEach(([text], index) => {
  questionNumberMap[`Q${index + 1}`] = normalize(text);
});

// ✅ Log extracted questions
console.log(`🧠 Extracted ${Object.keys(questionOptionMap).length} aptitude questions`);
for (const [questionKey, normalizedQuestion] of Object.entries(questionNumberMap)) {
  console.log(`🔍 ${questionKey}: ${normalizedQuestion}`);
}

// ✅ Extract all raw question headers (for comparison/debug)
const questions = await page.$$eval('div[role="listitem"]', items =>
  items.map(item => item.innerText.trim().split('\n')[0]).filter(Boolean)
);
console.log('🧠 Extracted raw question headers:', questions);

// ✅ Prompt header
const promptHeader = `You're an AI assistant helping fill a multiple-choice form. For each question below, return only the correct option letter (A–E).

Respond in this exact format:
A

Example:
B

Rules:
- Do not explain.
- Do not include the answer text.
- Do not include question numbers.
- Do not include punctuation or extra text.
- Only return the correct option letter (A–E).
- Do not invent questions.
- Do not skip any answers.
- Do not prefix answers with 'Q:' or 'A:' — just return the option letter only.
- Do not return values like "320" or "East" — only the letter of the correct option.`;

// ✅ Format questions and options
const formattedQuestions = Object.entries(questionOptionMap).map(([q, opts]) => {
  const labeledOpts = opts.map((opt, j) =>
    /^[A-E]\./.test(opt.trim()) ? opt.trim() : `${String.fromCharCode(65 + j)}. ${opt.trim()}`
  ); 
   const normalizedQ = normalize(q);

return `${normalizedQ}\nOptions:\n${labeledOpts.map(opt => opt.trim()).join('\n')}`;
}).join('\n\n');

const prompt = `${promptHeader}\n\n${formattedQuestions}`;
console.log('📤 Final Prompt Sent to Mistral:\n', prompt);

// ✅ Send to Mistral
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'mistral', prompt, stream: false })
});

const data = await response.json();

// ✅ Handle streamed or chunked response formats
const fullText = Array.isArray(data)
  ? data.map(chunk => chunk.response).join('\n')
  : typeof data.response === 'string'
    ? data.response
    : '';

if (!fullText || typeof fullText !== 'string') {
  console.error('❌ Mistral returned no usable response');
  return;
}

console.log('🧾 Raw Mistral output:\n', fullText);



// ✅ Extract Mistral answers (letters like A, B, C...) from mixed formats
const cleanedText = fullText.split('Note:')[0].trim();

const answerLetters = cleanedText
  .split(/[\n,]+/)
  .map(l => l.trim())
  .filter(l => /^[A-D]$/i.test(l))
  .map(l => l.toUpperCase())
  .slice(0, Object.keys(questionOptionMap).length); // ✅ Trim excess

console.log('📥 Mistral Answer Letters:', answerLetters);
const answerMap = {};
const formQuestions = Object.entries(questionOptionMap);

if (answerLetters.length !== formQuestions.length) {
  console.log(`⚠️ Warning: Mistral returned ${answerLetters.length} answers for ${formQuestions.length} questions`);
}

for (let i = 0; i < formQuestions.length; i++) {
  const [questionText, options] = formQuestions[i];
  const answerLetter = answerLetters[i];

  if (!answerLetter || !options || !options.length) {
    console.log(`🚫 Missing data for Q${i + 1}`);
    continue;
  }

const matchedOption = options.find(opt =>
  opt.trim().toUpperCase().startsWith(`${answerLetter}.`) ||
  opt.trim().toUpperCase().startsWith(`${answerLetter})`) ||
  opt.trim().toUpperCase().startsWith(`${answerLetter} `)
);


  if (matchedOption) {
    answerMap[normalize(questionText)] = matchedOption; // ✅ Now it's safe
    console.log(`✅ Matched Q${i + 1}: ${questionText} → ${matchedOption}`);
  } else {
    console.log(`🚫 No match for Q${i + 1}: ${answerLetter}`);
  }
}
console.log(`🧠 Parsed ${answerLetters.length} answers`);
console.log('🧠 Parsed Answers:', answerMap);

// ✅ Fix: Normalize when checking for unmatched
const unmatched = formQuestions
  .map(([q]) => ({ raw: q, normalized: normalize(q) }))
  .filter(({ normalized }) => !answerMap[normalized]);

if (unmatched.length > 0) {
  console.log(`⚠️ Unmatched questions:`);
  unmatched.forEach(({ raw, normalized }, i) =>
    console.log(`  ${i + 1}. ${raw} → ${normalized}`)
  );
}
// ✅ Normalize question maps
const normalizedQuestionNumberMap = {};
for (const [key, value] of Object.entries(questionNumberMap)) {
  normalizedQuestionNumberMap[normalize(key)] = value;
}

const normalizedQuestionOptionMap = {};
for (const [key, value] of Object.entries(questionOptionMap)) {
  normalizedQuestionOptionMap[normalize(key)] = value;
}


  // ✅ Normalize helper
 
for (const key of Object.keys(answerMap)) {
  const isMatch = Object.keys(questionOptionMap).some(q =>
    normalize(q).includes(normalize(key)) || normalize(key).includes(normalize(q))
  );

  if (!isMatch) {
    console.log(`🚫 Removing hallucinated or unmatched answer: ${key}`);
    delete answerMap[key];
  }
}


 
const allInputs = await page.$$(`input, textarea`);
const filledQuestions = [];

for (const input of allInputs) {
  let label = await input.getAttribute('aria-label');
  let cleanLabel = normalize(label || '');
  let matchedAnswer = answerMap[cleanLabel];

  // ✅ Try direct match using aria-label
  if (matchedAnswer && !isPersonal(label)) {
    await input.fill(matchedAnswer);
    filledQuestions.push(cleanLabel);
    console.log(`✍️ Filled input: ${label} → ${matchedAnswer}`);
    continue;
  }

  // ✅ Fallback to container text if aria-label is missing or unmatched
const containerText = label || await input.evaluate(el => {
  const item = el.closest('div[role="listitem"]');
  return item ? item.innerText.trim() : '';
});

const fallbackLabel = normalize(containerText.replace(/^[0-9]+\.\s*/, ''));
let matched = false;

for (const [question, answer] of Object.entries(answerMap)) {
  const normalizedQuestion = question;

  const questionMatch =
    fallbackLabel === normalizedQuestion ||
    fallbackLabel.includes(normalizedQuestion) ||
    normalizedQuestion.includes(fallbackLabel) ||
    normalizedQuestion.startsWith(fallbackLabel) ||
    fallbackLabel.startsWith(normalizedQuestion);

  if (questionMatch) {
    const isVisible = await input.isVisible();
    const isEnabled = await input.isEnabled();
    if (!isVisible || !isEnabled) continue;

    await input.fill(answer);
    filledQuestions.push(normalizedQuestion);
    console.log(`✍️ Fallback filled: ${normalizedQuestion} → ${answer}`);
    matched = true;
    break;
  }
}

if (!matched) {
  console.log(`⚠️ No match for input label: ${containerText}`);
}

// ✅ Log any unmatched questions
for (const question of Object.keys(answerMap)) {
  if (!filledQuestions.includes(question)) {
    console.log(`⚠️ Unfilled question: ${question}`);
  }
}
// ✅ Handle radio buttons

  for (const [question, answer] of Object.entries(answerMap)) {
  const items = await page.$$(`div[role="listitem"]`);
  for (const item of items) {
    const questionText = await item.evaluate(el => {
      const lines = el.innerText.split('\n').map(l => l.trim()).filter(Boolean);
      return lines.find(line => /^[0-9]+\./.test(line)) || lines[0];
    });

    const cleanQuestionText = normalize(questionText);
    const cleanAnswerKey = normalize(question);

    if (
      cleanQuestionText !== cleanAnswerKey &&
      !cleanQuestionText.includes(cleanAnswerKey) &&
      !cleanAnswerKey.includes(cleanQuestionText)
    ) continue;

    const radios = await item.$$(`div[role="radio"]`);
    let matched = false;

    for (const radio of radios) {
      const label = await radio.getAttribute('aria-label');
      if (
        label &&
        (
          normalize(label) === normalize(answer) ||
          normalize(answer).includes(normalize(label)) ||
          normalize(label).includes(normalize(answer))
        )
      ) {
        const isVisible = await radio.isVisible();
        const isEnabled = await radio.isEnabled();
        if (!isVisible || !isEnabled) continue;

        await radio.click();
        await page.waitForTimeout(300);
        console.log(`🔘 Selected radio for "${question}": ${label}`);
        matched = true;
        break;
      }
    }

    if (!matched) {
      console.log(`⚠️ No matching radio for "${question}" → ${answer}`);
    }
  }
}
// ✅ Handle checkboxes 
for (const [question, answer] of Object.entries(answerMap)) {
  const items = await page.$$(`div[role="listitem"]`);
  for (const item of items) {
    const questionText = await item.evaluate(el => el.innerText.split('\n')[0].trim());
    const cleanQuestionText = normalize(questionText);
    const cleanAnswerKey = normalize(question);

    if (
      cleanQuestionText !== cleanAnswerKey &&
      !cleanQuestionText.includes(cleanAnswerKey) &&
      !cleanAnswerKey.includes(cleanQuestionText)
    ) continue;

    const checkboxes = await item.$$(`div[role="checkbox"]`);
    if (!checkboxes.length) continue;

    const answers = answer.split(/[,;]\s*/).map(a => normalizeAnswer(a));

    for (const box of checkboxes) {
      const label = await box.getAttribute('aria-label');
      if (!label) continue;

      const normalizedLabel = normalizeAnswer(label);
      if (answers.includes(normalizedLabel)) {
        const isVisible = await box.isVisible();
        const isEnabled = await box.isEnabled();
        if (!isVisible || !isEnabled) continue;

        await box.click();
        console.log(`☑️ Checked for "${question}": ${label}`);
      }
    }
  }
}
  // ✅ Handle dropdowns
const dropdowns = await page.$$(`div[role="listbox"]`);
for (const dropdown of dropdowns) {
  const questionText = await dropdown.evaluate(el =>
    el.closest('div[role="listitem"]')?.innerText || ''
  );

  const cleanQuestionText = normalize(questionText);
  let matchedAnswer = null;

  for (const [question, answer] of Object.entries(answerMap)) {
    const cleanAnswerKey = normalize(question);
    if (
      cleanQuestionText === cleanAnswerKey ||
      cleanQuestionText.includes(cleanAnswerKey) ||
      cleanAnswerKey.includes(cleanQuestionText)
    ) {
      matchedAnswer = answer;
      console.log(`✅ Matched dropdown question: ${question} → ${matchedAnswer}`);
      break;
    }
  }

  if (!matchedAnswer) {
    console.log(`⚠️ No answer found for dropdown question: ${questionText}`);
    continue;
  }

  const isVisible = await dropdown.isVisible();
  const isEnabled = await dropdown.isEnabled();
  if (!isVisible || !isEnabled) {
    console.log(`🚫 Skipping hidden or disabled dropdown: ${questionText}`);
    continue;
  }

  await dropdown.click();
  await page.waitForTimeout(500);

  const options = await dropdown.$$(`div[role="option"]`);
  let matched = false;

  for (const option of options) {
    const label = await option.getAttribute('aria-label') || await option.innerText();
    if (
      normalize(label) === normalize(matchedAnswer) ||
      normalize(matchedAnswer).includes(normalize(label)) ||
      normalize(label).includes(normalize(matchedAnswer))
    ) {
      await option.click();
      console.log(`🔽 Selected dropdown: ${label}`);
      matched = true;
      break;
    }
  }

  if (!matched) {
    console.log(`⚠️ No matching dropdown option for: ${matchedAnswer}`);
  }
}

// ✅ Screenshot
const screenshotPath = path.join(__dirname, 'form-preview.png');
await page.screenshot({ path: screenshotPath });
console.log(`🖼️ Preview saved at ${screenshotPath}`);

// ✅ Submit only for public forms
if (!isRestricted) {
  await page.waitForTimeout(15000); // ⏳ Wait before submitting

  try {
    const submitButton = page.locator(`div[role="button"]:has-text("Submit")`);
    if (
      await submitButton.count() > 0 &&
      await submitButton.isVisible() &&
      await submitButton.isEnabled()
    ) {
      await submitButton.click();
      console.log('✅ Form submitted automatically');
    } else {
      console.log('⚠️ Submit button not found or not clickable');
    }
  } catch (err) {
    console.log(`❌ Submit failed: ${err.message}`);
  }

  await page.waitForTimeout(50000);
} else {
  console.log('🔒 Restricted form — user must submit manually');
  await page.waitForTimeout(30000); // ⏳ Give user time to submit manually
}
}
console.log('🛑 Browser session ended');
await browser.close();
}
export { autoFillGoogleForm };