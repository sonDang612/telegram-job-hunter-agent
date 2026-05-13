# 🤖 Job Hunter Bot — Telegram

> Upload your CV → AI analyzes it → Automatically searches jobs from 10 Vietnamese platforms → Export results to Excel

---

## ✨ Features

| Feature                  | Details                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| 📄 CV Upload             | Upload PDF files or paste CV text                                                               |
| 🤖 AI Analysis           | DeepSeek AI extracts skills, keywords, and experience level                                     |
| 🔍 10 Job Sources        | ITviec, TopDev, VietnamWorks, CareerViet, 123Job, JobsGO, Glints, LinkedIn, TopCV, TimViecNhanh |
| 📊 Excel Export          | 3 sheets: Jobs, CV Profile, Stats — with filter/sort support                                    |
| ⚡ Concurrent Processing | Run multiple scrapers in parallel                                                               |

---

## 🚀 Installation

### 1. Requirements

- Node.js >= 18
- Telegram Bot Token (create via [@BotFather](https://t.me/BotFather))
- DeepSeek API Key ([platform.deepseek.com](https://platform.deepseek.com))

### 2. Clone & Install

```bash
git clone <repo>
cd job-hunter-bot
npm install
```

### 3. Configure `.env`

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
DEEPSEEK_API_KEY=sk-...
```

### 4. Run the Bot

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

---

## 📱 Usage

```text
1. Open Telegram and find your bot
2. Type /start
3. Upload your CV PDF or paste CV text
4. Wait around 1–2 minutes
5. Receive the Excel result file
```

### Commands

| Command             | Description                |
| ------------------- | -------------------------- |
| `/start`            | Start the bot              |
| `/help`             | Show usage instructions    |
| `/status`           | Check bot status           |
| `/search <keyword>` | Quick keyword-based search |

---

## 📁 Project Structure

```text
job-hunter-bot/
├── src/
│   ├── index.js          # Telegram bot & message handling
│   ├── cvAnalyzer.js     # DeepSeek AI CV analysis
│   ├── researcher.js     # Scraper orchestrator
│   ├── scrapers.js       # 10 job scrapers
│   ├── excelExporter.js  # Excel export generator
│   └── logger.js         # Winston logger
├── output/               # Temporary Excel files
├── .env.example
├── package.json
└── README.md
```

---

## ⚙️ Advanced Configuration (.env)

```env
# Maximum jobs per source (default: 20)
MAX_JOBS_PER_SOURCE=20

# Number of concurrent scrapers (default: 3)
CONCURRENCY=3

# DeepSeek model
DEEPSEEK_MODEL=deepseek-chat

# Log level: error | warn | info | debug
LOG_LEVEL=info
```

---

## 🐳 Docker (Optional)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

CMD ["node", "src/index.js"]
```

```bash
docker build -t job-hunter-bot .

docker run -d \
  --env-file .env \
  --name job-bot \
  job-hunter-bot
```

---

## 📊 Excel Output

The generated Excel file contains **3 sheets**:

- **Jobs Found**: All matching jobs with filter/sort support — Job Title, Company, Salary Range, Location, Source, Link
- **CV Profile**: AI-analyzed candidate profile from DeepSeek
- **📊 Stats**: Job statistics grouped by source

---

## 🔧 Add a New Job Source

Open `src/scrapers.js` and add a new scraper function:

```js
async function scrapeMyNewSite(keywords) {
  const jobs = [];

  // scraping logic

  return jobs; // [{ title, company, salary, location, link, source }]
}
```

Then add it to the `scrapers` array at the bottom of the file.

---

## ⚠️ Notes

- LinkedIn may block scraping requests — consider using proxies or VPNs if needed
- Some websites may change their HTML structure over time — selectors may require updates
- DeepSeek API cost is extremely low (~$0.0001 per CV analysis)
- The bot processes only one request per user at a time

---

## 📄 License

MIT — free to use, modify, and distribute.
