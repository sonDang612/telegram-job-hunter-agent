const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('./logger');

const MAX = parseInt(process.env.MAX_JOBS_PER_SOURCE) || 20;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

async function get(url, params = {}) {
  const res = await axios.get(url, { headers: HEADERS, params, timeout: 20000 });
  return cheerio.load(res.data);
}

async function getJson(url, params = {}, extraHeaders = {}) {
  const res = await axios.get(url, {
    headers: { ...HEADERS, ...extraHeaders },
    params,
    timeout: 20000,
  });
  return res.data;
}

// ─── 1. ITviec ────────────────────────────────────────────────────────────────
async function scrapeITviec(keywords) {
  const jobs = [];
  try {
    const query = keywords.slice(0, 2).join(' ');
    const $ = await get(`https://itviec.com/it-jobs/${encodeURIComponent(query.replace(/ /g, '-'))}`);

    $('[data-controller="job-card"]').slice(0, MAX).each((_, el) => {
      const title = $(el).find('.job-name a').text().trim();
      const company = $(el).find('.employer-name').text().trim();
      const salary = $(el).find('.salary').text().trim() || 'Thỏa thuận';
      const location = $(el).find('.location').text().trim() || 'Hồ Chí Minh';
      const href = $(el).find('.job-name a').attr('href') || '';
      const link = href.startsWith('http') ? href : `https://itviec.com${href}`;

      if (title) jobs.push({ title, company, salary, location, link, source: 'ITviec' });
    });

    logger.info(`ITviec: ${jobs.length} jobs`);
  } catch (e) {
    logger.warn(`ITviec failed: ${e.message}`);
  }
  return jobs;
}

// ─── 2. TopDev ────────────────────────────────────────────────────────────────
async function scrapeTopDev(keywords) {
  const jobs = [];
  try {
    const query = keywords.slice(0, 2).join(' ');
    const data = await getJson('https://topdev.vn/api/jobs', {
      q: query,
      page: 1,
      per_page: MAX,
    }, { Referer: 'https://topdev.vn' });

    const list = data?.data?.jobs || data?.jobs || [];
    list.forEach(job => {
      jobs.push({
        title: job.title || job.name || '',
        company: job.company?.name || job.company_name || '',
        salary: job.salary || job.salary_range || 'Thỏa thuận',
        location: (job.addresses || []).map(a => a.city || a.name).join(', ') || 'Hà Nội/HCM',
        link: `https://topdev.vn/jobs/${job.alias || job.id}`,
        source: 'TopDev',
      });
    });
    logger.info(`TopDev API: ${jobs.length} jobs`);
  } catch {
    // Fallback scrape
    try {
      const query = keywords.slice(0, 2).join('+');
      const $ = await get(`https://topdev.vn/viec-lam-it?q=${encodeURIComponent(keywords[0])}`);
      $('.job-item, [class*="job-card"]').slice(0, MAX).each((_, el) => {
        const title = $(el).find('h3, .title, [class*="title"]').first().text().trim();
        const company = $(el).find('[class*="company"]').first().text().trim();
        const salary = $(el).find('[class*="salary"]').text().trim() || 'Thỏa thuận';
        const location = $(el).find('[class*="location"], [class*="address"]').first().text().trim() || 'HCM/HN';
        const href = $(el).find('a').first().attr('href') || '';
        const link = href.startsWith('http') ? href : `https://topdev.vn${href}`;
        if (title) jobs.push({ title, company, salary, location, link, source: 'TopDev' });
      });
      logger.info(`TopDev scrape: ${jobs.length} jobs`);
    } catch (e2) {
      logger.warn(`TopDev failed: ${e2.message}`);
    }
  }
  return jobs;
}

// ─── 3. VietnamWorks ─────────────────────────────────────────────────────────
async function scrapeVietnamWorks(keywords) {
  const jobs = [];
  try {
    const query = keywords.slice(0, 2).join(' ');
    const data = await getJson('https://ms.vietnamworks.com/job-search/v1.0/jobs', {
      query,
      page: 0,
      size: MAX,
      userId: 0,
    }, {
      Referer: 'https://www.vietnamworks.com',
      Origin: 'https://www.vietnamworks.com',
    });

    const list = data?.data || data?.jobs || [];
    list.forEach(job => {
      const salaryMin = job.salaryMin || 0;
      const salaryMax = job.salaryMax || 0;
      const salaryCurrency = job.currency || 'USD';
      const salary = salaryMin && salaryMax
        ? `${salaryMin}-${salaryMax} ${salaryCurrency}`
        : job.salary || 'Thỏa thuận';
      jobs.push({
        title: job.jobTitle || '',
        company: job.companyName || '',
        salary,
        location: job.locationNames?.join(', ') || 'Hà Nội/HCM',
        link: `https://www.vietnamworks.com/${job.jobUrl || job.id}`,
        source: 'VietnamWorks',
      });
    });
    logger.info(`VietnamWorks: ${jobs.length} jobs`);
  } catch (e) {
    logger.warn(`VietnamWorks failed: ${e.message}`);
  }
  return jobs;
}

// ─── 4. CareerViet ───────────────────────────────────────────────────────────
async function scrapeCareerViet(keywords) {
  const jobs = [];
  try {
    const query = keywords.slice(0, 2).join(' ');
    const $ = await get(`https://careerviet.vn/tim-viec-lam/${encodeURIComponent(query.replace(/ /g, '-'))}-vi.html`);

    $('.job-item, .job_item, [class*="item-job"]').slice(0, MAX).each((_, el) => {
      const title = $(el).find('h2 a, .title a, [class*="title"] a').first().text().trim();
      const company = $(el).find('[class*="company"] a, [class*="company"] span').first().text().trim();
      const salary = $(el).find('[class*="salary"], .salary-text').text().trim() || 'Thỏa thuận';
      const location = $(el).find('[class*="location"], .location').first().text().trim() || 'HCM';
      const href = $(el).find('h2 a, .title a').attr('href') || '';
      const link = href.startsWith('http') ? href : `https://careerviet.vn${href}`;
      if (title) jobs.push({ title, company, salary, location, link, source: 'CareerViet' });
    });
    logger.info(`CareerViet: ${jobs.length} jobs`);
  } catch (e) {
    logger.warn(`CareerViet failed: ${e.message}`);
  }
  return jobs;
}

// ─── 5. 123Job ────────────────────────────────────────────────────────────────
async function scrape123Job(keywords) {
  const jobs = [];
  try {
    const query = keywords[0];
    const $ = await get(`https://www.123job.vn/viec-lam?keyword=${encodeURIComponent(query)}`);

    $('.job-item, [class*="job-item"]').slice(0, MAX).each((_, el) => {
      const title = $(el).find('.title a, h3 a').first().text().trim();
      const company = $(el).find('[class*="company"], .company').first().text().trim();
      const salary = $(el).find('[class*="salary"]').text().trim() || 'Thỏa thuận';
      const location = $(el).find('[class*="location"]').text().trim() || 'HCM';
      const href = $(el).find('a').first().attr('href') || '';
      const link = href.startsWith('http') ? href : `https://www.123job.vn${href}`;
      if (title) jobs.push({ title, company, salary, location, link, source: '123Job' });
    });
    logger.info(`123Job: ${jobs.length} jobs`);
  } catch (e) {
    logger.warn(`123Job failed: ${e.message}`);
  }
  return jobs;
}

// ─── 6. JobsGO ───────────────────────────────────────────────────────────────
async function scrapeJobsGO(keywords) {
  const jobs = [];
  try {
    const data = await getJson('https://api.jobsgo.vn/api/jobs', {
      search: keywords.slice(0, 2).join(' '),
      page: 1,
      per_page: MAX,
    });

    const list = data?.data?.data || data?.data || [];
    list.forEach(job => {
      const salaryMin = job.salary_min || 0;
      const salaryMax = job.salary_max || 0;
      const salary = salaryMin && salaryMax
        ? `${(salaryMin / 1e6).toFixed(0)}-${(salaryMax / 1e6).toFixed(0)}M VNĐ`
        : 'Thỏa thuận';
      jobs.push({
        title: job.title || '',
        company: job.company?.name || '',
        salary,
        location: job.province?.name || 'HCM',
        link: `https://jobsgo.vn/viec-lam/${job.slug || job.id}.html`,
        source: 'JobsGO',
      });
    });
    logger.info(`JobsGO: ${jobs.length} jobs`);
  } catch (e) {
    logger.warn(`JobsGO failed: ${e.message}`);
  }
  return jobs;
}

// ─── 7. Glints Vietnam ───────────────────────────────────────────────────────
async function scrapeGlints(keywords) {
  const jobs = [];
  try {
    const data = await getJson('https://glints.com/api/jobs/getJobs', {
      query: keywords.slice(0, 2).join(' '),
      countryCode: 'VN',
      page: 0,
      pageSize: MAX,
    });

    const list = data?.data?.jobs || [];
    list.forEach(job => {
      const salaryMin = job.minSalary || 0;
      const salaryMax = job.maxSalary || 0;
      const salary = salaryMin && salaryMax
        ? `${salaryMin}-${salaryMax} ${job.salaryCurrency || 'VND'}`
        : 'Thỏa thuận';
      jobs.push({
        title: job.title || '',
        company: job.company?.name || '',
        salary,
        location: job.country?.name || 'Vietnam',
        link: `https://glints.com/vn/opportunities/jobs/${job.id}`,
        source: 'Glints',
      });
    });
    logger.info(`Glints: ${jobs.length} jobs`);
  } catch (e) {
    logger.warn(`Glints failed: ${e.message}`);
  }
  return jobs;
}

// ─── 8. LinkedIn (public search) ─────────────────────────────────────────────
async function scrapeLinkedIn(keywords) {
  const jobs = [];
  try {
    const query = keywords.slice(0, 2).join(' ');
    const $ = await get(
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=Vietnam&f_TPR=r604800`,
    );

    $('.job-search-card, .base-card').slice(0, MAX).each((_, el) => {
      const title = $(el).find('.base-search-card__title').text().trim();
      const company = $(el).find('.base-search-card__subtitle').text().trim();
      const location = $(el).find('.job-search-card__location').text().trim();
      const href = $(el).find('a.base-card__full-link').attr('href') || $(el).find('a').first().attr('href') || '';
      if (title) {
        jobs.push({
          title,
          company,
          salary: 'Xem tại LinkedIn',
          location: location || 'Vietnam',
          link: href.split('?')[0],
          source: 'LinkedIn',
        });
      }
    });
    logger.info(`LinkedIn: ${jobs.length} jobs`);
  } catch (e) {
    logger.warn(`LinkedIn failed: ${e.message}`);
  }
  return jobs;
}

// ─── 9. Topcv ────────────────────────────────────────────────────────────────
async function scrapeTopCV(keywords) {
  const jobs = [];
  try {
    const query = keywords.slice(0, 2).join(' ');
    const $ = await get(`https://www.topcv.vn/tim-viec-lam-${encodeURIComponent(keywords[0].replace(/ /g, '-'))}-viec-lam`);

    $('.job-item-search-result, [class*="job-item"]').slice(0, MAX).each((_, el) => {
      const title = $(el).find('h3.title, .title a').first().text().trim();
      const company = $(el).find('[class*="company"]').first().text().trim();
      const salary = $(el).find('[class*="salary"]').text().trim() || 'Thỏa thuận';
      const location = $(el).find('[class*="location"], [class*="address"]').first().text().trim() || 'HCM';
      const href = $(el).find('a').first().attr('href') || '';
      const link = href.startsWith('http') ? href : `https://www.topcv.vn${href}`;
      if (title) jobs.push({ title, company, salary, location, link, source: 'TopCV' });
    });
    logger.info(`TopCV: ${jobs.length} jobs`);
  } catch (e) {
    logger.warn(`TopCV failed: ${e.message}`);
  }
  return jobs;
}

// ─── 10. TimViecNhanh ─────────────────────────────────────────────────────────
async function scrapeTimViecNhanh(keywords) {
  const jobs = [];
  try {
    const query = keywords[0].replace(/ /g, '-').toLowerCase();
    const $ = await get(`https://timviecnhanh.com/viec-lam-${encodeURIComponent(query)}`);

    $('.job-item, [class*="job-item"]').slice(0, MAX).each((_, el) => {
      const title = $(el).find('.title a, h2 a, h3 a').first().text().trim();
      const company = $(el).find('[class*="company"]').first().text().trim();
      const salary = $(el).find('[class*="salary"]').text().trim() || 'Thỏa thuận';
      const location = $(el).find('[class*="location"]').first().text().trim() || 'HCM';
      const href = $(el).find('a').first().attr('href') || '';
      const link = href.startsWith('http') ? href : `https://timviecnhanh.com${href}`;
      if (title) jobs.push({ title, company, salary, location, link, source: 'TimViecNhanh' });
    });
    logger.info(`TimViecNhanh: ${jobs.length} jobs`);
  } catch (e) {
    logger.warn(`TimViecNhanh failed: ${e.message}`);
  }
  return jobs;
}

module.exports = {
  scrapers: [
    { name: 'ITviec', fn: scrapeITviec },
    { name: 'TopDev', fn: scrapeTopDev },
    { name: 'VietnamWorks', fn: scrapeVietnamWorks },
    { name: 'CareerViet', fn: scrapeCareerViet },
    { name: '123Job', fn: scrape123Job },
    { name: 'JobsGO', fn: scrapeJobsGO },
    { name: 'Glints', fn: scrapeGlints },
    { name: 'LinkedIn', fn: scrapeLinkedIn },
    { name: 'TopCV', fn: scrapeTopCV },
    { name: 'TimViecNhanh', fn: scrapeTimViecNhanh },
  ],
};
