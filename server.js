const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_BASE = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API: ${error.message}`);
  }

  const data = await response.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No JSON in response');
  return JSON.parse(clean.slice(start, end + 1));
}

app.get('/api/myths', async (req, res) => {
  try {
    const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const systemPrompt = `You are a real-time misinformation analyst. Today is ${TODAY}. Search the web for LATEST viral myths. Return ONLY JSON array with: claim, category (health/politics/tech/science/finance/celebrity/climate/war/ai), status (debunked/disputed), virality (1-100), verdict, source, sourceUrl, platforms, time. 10-12 myths.`;
    const myths = await callClaude(systemPrompt, `Find top viral myths today`);
    res.json({ success: true, data: myths });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/instagram-myths', async (req, res) => {
  try {
    const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const systemPrompt = `You are Instagram misinformation analyst. Today is ${TODAY}. Find myths spreading on Instagram NOW. Return ONLY JSON: claim, category, status, virality, verdict, source, sourceUrl, hashtags, time. 8 myths.`;
    const myths = await callClaude(systemPrompt, `Top Instagram myths today`);
    res.json({ success: true, data: myths });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/news/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const cats = { world: 'World', politics: 'Politics', ai: 'AI', social: 'Social Media', tech: 'Tech', economy: 'Economy', science: 'Science', climate: 'Climate', movies: 'Movies', music: 'Music', sports: 'Sports', health: 'Health', crime: 'Crime', business: 'Business' };
    const cat = cats[category] || category;
    const systemPrompt = `Real-time news aggregator. Today is ${TODAY}. Find LATEST ${cat} news. Return ONLY JSON: headline, summary, source, sourceUrl (REQUIRED), region, time, breaking, tag (verified/developing). 10-14 items.`;
    const news = await callClaude(systemPrompt, `Latest ${cat} news today`);
    res.json({ success: true, data: news });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TruthPulse API on ${PORT}`));

module.exports = app;
