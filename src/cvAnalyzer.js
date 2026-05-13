const axios = require("axios");
const logger = require("./logger");

const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions";

/**
 * Analyze CV text and extract structured profile + search keywords
 */
async function analyzeCV(cvText) {
  logger.info("🤖 Analyzing CV with DeepSeek...");

  const prompt = `You are an expert technical recruiter and HR consultant specializing in IT hiring in Vietnam.

      Your task is to analyze the CV content and extract structured candidate information optimized for job matching, ATS systems, and recruitment search.

      CV Content:
      ---
      ${cvText.slice(0, 12000)}
      ---

      IMPORTANT RULES:
      - Return ONLY valid JSON.
      - Do NOT use markdown.
      - Do NOT add explanations, comments, or extra text.
      - If information is missing, use empty string "" or empty array [].
      - Infer reasonable values from the CV when possible.
      - Keep search_keywords highly relevant for Vietnamese tech recruitment platforms.
      - Normalize technologies and job titles into standard industry terms.
      - Avoid duplicate skills or keywords.
      - Output must be parseable with JSON.parse().

      LEVEL MAPPING:
      - intern = student/internship trainee
      - fresher = <1 year experience
      - junior = 1-2 years
      - middle = 2-4 years
      - senior = 4-7 years
      - lead = technical leadership/team lead
      - manager = engineering/product/department manager

      EXTRACTION GUIDELINES:

      1. title
      - Use the strongest/current target role.
      - Examples:
        "Frontend Developer"
        "Full Stack Engineer"
        "React Native Developer"
        "Backend Engineer"

      2. experience_years
      - Estimate total professional experience in years.
      - Use number only.
      - Example: 2.5

      3. skills
      - Extract only meaningful technical/professional skills.
      - Include frameworks, languages, databases, cloud, tooling, architecture, mobile/web technologies.
      - Examples:
        ["React.js", "Next.js", "Node.js", "TypeScript", "AWS", "PostgreSQL"]

      4. languages
      - Include:
        - programming languages
        - spoken languages if mentioned
      - Examples:
        ["JavaScript", "TypeScript", "English", "Vietnamese"]

      5. industries
      - Infer industries from projects/work history.
      - Examples:
        ["E-commerce", "Sports Betting", "Fintech", "AI", "Healthcare", "SaaS"]

      6. search_keywords
      - Generate 8-15 high-value recruitment keywords.
      - Prioritize:
        - job titles
        - primary frameworks
        - backend/frontend/mobile stacks
        - cloud/devops keywords
        - architecture keywords
      - Include common Vietnam hiring terms.
      - Examples:
        [
          "React Native Developer",
          "Next.js Developer",
          "Node.js Engineer",
          "Full Stack Developer",
          "TypeScript",
          "NestJS",
          "AWS",
          "MongoDB"
        ]

      7. summary
      - Write a concise professional recruiter-style summary.
      - Maximum 2 sentences.
      - Focus on:
        - years of experience
        - core stack
        - strongest achievements/domain expertise

      Return ONLY this JSON structure:
      {
        "name": "",
        "title": "",
        "experience_years": 0,
        "skills": [],
        "languages": [],
        "level": "",
        "industries": [],
        "search_keywords": [],
        "summary": ""
      }`;

  const response = await axios.post(
    DEEPSEEK_API,
    {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    },
  );

  const raw = response.data.choices[0].message.content.trim();
  // Strip markdown fences if present
  const json = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  try {
    const profile = JSON.parse(json);
    logger.info(
      `✅ CV analyzed: ${profile.title} (${profile.level}), keywords: ${profile.search_keywords.join(", ")}`,
    );
    return profile;
  } catch {
    logger.warn("Failed to parse DeepSeek JSON, using fallback extraction");
    return fallbackExtract(cvText);
  }
}

function fallbackExtract(text) {
  const keywords = [];
  const techStack = [
    "nodejs",
    "react",
    "python",
    "java",
    "php",
    "golang",
    "devops",
    "frontend",
    "backend",
    "fullstack",
    "mobile",
    "flutter",
    "android",
    "ios",
  ];
  const lower = text.toLowerCase();
  techStack.forEach((t) => {
    if (lower.includes(t)) keywords.push(t);
  });

  return {
    name: "",
    title: "Software Developer",
    experience_years: 2,
    skills: keywords.slice(0, 5),
    languages: [],
    level: "middle",
    industries: ["IT", "Technology"],
    search_keywords: keywords.length
      ? keywords.slice(0, 5)
      : ["developer", "software engineer"],
    summary: "Software developer seeking new opportunities in Vietnam.",
  };
}

module.exports = { analyzeCV };
