const axios = require('axios');
const logger = require('./logger');

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Analyze CV text and extract structured profile + search keywords
 */
async function analyzeCV(cvText) {
  logger.info('🤖 Analyzing CV with DeepSeek...');

  const prompt = `You are a professional HR consultant. Analyze this CV and extract key information for job searching.

CV Content:
---
${cvText.slice(0, 8000)}
---

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "name": "candidate full name or empty string",
  "title": "current/target job title",
  "experience_years": number,
  "skills": ["skill1", "skill2", ...],
  "languages": ["programming or spoken language"],
  "level": "intern|fresher|junior|middle|senior|lead|manager",
  "industries": ["industry1", "industry2"],
  "search_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "summary": "2-sentence candidate summary"
}

Focus search_keywords on job titles and main technical skills that will find the best job matches in Vietnam.`;

  const response = await axios.post(
    DEEPSEEK_API,
    {
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const raw = response.data.choices[0].message.content.trim();
  // Strip markdown fences if present
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  try {
    const profile = JSON.parse(json);
    logger.info(`✅ CV analyzed: ${profile.title} (${profile.level}), keywords: ${profile.search_keywords.join(', ')}`);
    return profile;
  } catch {
    logger.warn('Failed to parse DeepSeek JSON, using fallback extraction');
    return fallbackExtract(cvText);
  }
}

function fallbackExtract(text) {
  const keywords = [];
  const techStack = ['nodejs', 'react', 'python', 'java', 'php', 'golang', 'devops', 'frontend', 'backend', 'fullstack', 'mobile', 'flutter', 'android', 'ios'];
  const lower = text.toLowerCase();
  techStack.forEach(t => { if (lower.includes(t)) keywords.push(t); });

  return {
    name: '',
    title: 'Software Developer',
    experience_years: 2,
    skills: keywords.slice(0, 5),
    languages: [],
    level: 'middle',
    industries: ['IT', 'Technology'],
    search_keywords: keywords.length ? keywords.slice(0, 5) : ['developer', 'software engineer'],
    summary: 'Software developer seeking new opportunities in Vietnam.',
  };
}

module.exports = { analyzeCV };
