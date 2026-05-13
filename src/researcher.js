const pLimit = require('p-limit');
const { scrapers } = require('./scrapers');
const logger = require('./logger');

const CONCURRENCY = parseInt(process.env.CONCURRENCY) || 3;

/**
 * Run all scrapers concurrently with a concurrency limit
 */
async function researchJobs(profile) {
  const keywords = profile.search_keywords || [profile.title || 'developer'];
  logger.info(`🔍 Starting research with keywords: [${keywords.join(', ')}]`);

  const limit = pLimit(CONCURRENCY);
  const results = await Promise.allSettled(
    scrapers.map(({ name, fn }) =>
      limit(async () => {
        try {
          const jobs = await fn(keywords);
          return jobs;
        } catch (e) {
          logger.warn(`${name} threw: ${e.message}`);
          return [];
        }
      })
    )
  );

  const allJobs = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));

  // Deduplicate by normalizing title+company
  const seen = new Set();
  const unique = allJobs.filter(job => {
    const key = `${job.title?.toLowerCase().trim()}|${job.company?.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter by relevance using keywords
  const keywordLower = keywords.map(k => k.toLowerCase());
  const scored = unique.map(job => {
    const haystack = `${job.title} ${job.company}`.toLowerCase();
    const score = keywordLower.reduce((s, k) => s + (haystack.includes(k) ? 1 : 0), 0);
    return { ...job, _score: score };
  });

  // Sort: relevant first, then by source diversity
  scored.sort((a, b) => b._score - a._score);
  const final = scored.map(({ _score, ...j }) => j);

  logger.info(`📦 Total unique jobs found: ${final.length}`);
  return final;
}

module.exports = { researchJobs };
