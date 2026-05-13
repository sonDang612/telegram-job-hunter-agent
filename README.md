# 🤖 Job Hunter Bot — Telegram

> Gửi CV → AI phân tích → Tự động tìm job từ 10 nguồn VN → Xuất Excel

---

## ✨ Tính năng

| Tính năng | Chi tiết |
|---|---|
| 📄 Nhận CV | PDF upload hoặc paste text |
| 🤖 AI Phân tích | DeepSeek AI extract skills, keywords, level |
| 🔍 10 Nguồn | ITviec, TopDev, VietnamWorks, CareerViet, 123Job, JobsGO, Glints, LinkedIn, TopCV, TimViecNhanh |
| 📊 Xuất Excel | 3 sheet: Jobs, CV Profile, Stats — có filter/sort |
| ⚡ Concurrent | Chạy song song nhiều nguồn |

---

## 🚀 Cài đặt

### 1. Yêu cầu
- Node.js >= 18
- Telegram Bot Token (tạo qua [@BotFather](https://t.me/BotFather))
- DeepSeek API Key ([platform.deepseek.com](https://platform.deepseek.com))

### 2. Clone & Install

```bash
git clone <repo>
cd job-hunter-bot
npm install
```

### 3. Cấu hình .env

```bash
cp .env.example .env
```

Mở `.env` và điền:
```
TELEGRAM_BOT_TOKEN=123456789:ABCdef...    # từ BotFather
DEEPSEEK_API_KEY=sk-...                   # từ DeepSeek platform
```

### 4. Chạy bot

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

---

## 📱 Cách dùng

```
1. Mở Telegram, tìm bot của bạn
2. /start để bắt đầu
3. Gửi file PDF CV hoặc paste text CV
4. Chờ ~1-2 phút
5. Nhận file Excel kết quả!
```

### Các lệnh

| Lệnh | Tác dụng |
|---|---|
| `/start` | Giới thiệu bot |
| `/help` | Hướng dẫn sử dụng |
| `/status` | Kiểm tra trạng thái |
| `/search <keyword>` | Tìm nhanh theo từ khóa |

---

## 📁 Cấu trúc project

```
job-hunter-bot/
├── src/
│   ├── index.js          # Telegram bot, xử lý message
│   ├── cvAnalyzer.js     # DeepSeek AI phân tích CV
│   ├── researcher.js     # Orchestrate scrapers
│   ├── scrapers.js       # 10 scrapers (ITviec, TopDev, ...)
│   ├── excelExporter.js  # Xuất file Excel đẹp
│   └── logger.js         # Winston logger
├── output/               # File Excel tạm (tự xóa sau khi gửi)
├── .env.example
├── package.json
└── README.md
```

---

## ⚙️ Cấu hình nâng cao (.env)

```env
# Số jobs tối đa mỗi nguồn (default: 20)
MAX_JOBS_PER_SOURCE=20

# Số scrapers chạy đồng thời (default: 3)
CONCURRENCY=3

# DeepSeek model
DEEPSEEK_MODEL=deepseek-chat

# Log level: error | warn | info | debug
LOG_LEVEL=info
```

---

## 🐳 Docker (optional)

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
docker run -d --env-file .env --name job-bot job-hunter-bot
```

---

## 📊 Excel Output

File Excel gồm **3 sheet**:

- **Jobs Found**: Tất cả jobs với filter/sort — Tên Job, Công Ty, Range Lương, Địa Điểm, Nguồn, Link
- **CV Profile**: Kết quả phân tích CV từ DeepSeek AI  
- **📊 Stats**: Thống kê số job theo từng nguồn

---

## 🔧 Thêm nguồn mới

Mở `src/scrapers.js`, thêm function:

```js
async function scrapeMyNewSite(keywords) {
  const jobs = [];
  // ... scraping logic
  return jobs; // [{ title, company, salary, location, link, source }]
}
```

Rồi add vào array `scrapers` ở cuối file.

---

## ⚠️ Lưu ý

- LinkedIn có thể block scraping — dùng VPN hoặc proxy nếu cần
- Một số site thay đổi HTML structure — cần update selector
- DeepSeek API: ~$0.0001/CV analysis (rất rẻ)
- Bot chỉ xử lý 1 request per user cùng lúc

---

## 📄 License

MIT — free to use, modify, distribute.
