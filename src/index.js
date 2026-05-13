require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const { analyzeCV } = require('./cvAnalyzer');
const { researchJobs } = require('./researcher');
const { exportToExcel } = require('./excelExporter');
const logger = require('./logger');

// ─── Validation ──────────────────────────────────────────────────────────────
if (!process.env.TELEGRAM_BOT_TOKEN) {
  logger.error('❌ Missing TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}
if (!process.env.DEEPSEEK_API_KEY) {
  logger.error('❌ Missing DEEPSEEK_API_KEY in .env');
  process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';
const userState = new Map(); // chatId → state

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function sendTyping(chatId) {
  await bot.sendChatAction(chatId, 'typing');
}

async function progressMsg(chatId, text) {
  return bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

async function editMsg(chatId, msgId, text) {
  try {
    await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown' });
  } catch {
    /* ignore if message not modified */
  }
}

function buildSummary(profile, jobs) {
  const bySrc = {};
  jobs.forEach(j => { bySrc[j.source] = (bySrc[j.source] || 0) + 1; });
  const srcSummary = Object.entries(bySrc)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  • *${k}*: ${v} jobs`)
    .join('\n');

  return `✅ *Xong rồi!* Tìm được *${jobs.length}* việc làm phù hợp\n\n` +
    `👤 *Profile*: ${profile.title} (${profile.level})\n` +
    `🛠️ *Skills*: ${(profile.skills || []).slice(0, 5).join(', ')}\n\n` +
    `📊 *Nguồn*:\n${srcSummary}\n\n` +
    `📁 File Excel đang được gửi...`;
}

// ─── CV Processing Pipeline ──────────────────────────────────────────────────
async function processCVPipeline(chatId, cvText) {
  userState.set(chatId, 'processing');
  let msgId;

  try {
    // Step 1: Analyze CV
    msgId = (await progressMsg(chatId, '🤖 *Bước 1/3* — Đang phân tích CV với DeepSeek AI...')).message_id;
    await sendTyping(chatId);
    const profile = await analyzeCV(cvText);

    await editMsg(chatId, msgId, 
      `🤖 *Bước 1/3* — Phân tích CV xong!\n\n` +
      `👤 *${profile.title}* (${profile.level})\n` +
      `🔑 Keywords: \`${profile.search_keywords?.join(', ')}\``
    );

    // Step 2: Research jobs
    const msg2 = await progressMsg(chatId, `🔍 *Bước 2/3* — Đang tìm kiếm từ *10 nguồn*...\n_(ITviec, TopDev, VietnamWorks, LinkedIn, Glints, ...)_`);
    await sendTyping(chatId);

    const jobs = await researchJobs(profile);

    await editMsg(chatId, msg2.message_id,
      `🔍 *Bước 2/3* — Tìm xong *${jobs.length}* job từ 10 nguồn!`
    );

    // Step 3: Export Excel
    const msg3 = await progressMsg(chatId, '📊 *Bước 3/3* — Đang tạo file Excel...');
    await sendTyping(chatId);

    const filePath = await exportToExcel(jobs, profile, OUTPUT_DIR);

    await editMsg(chatId, msg3.message_id, '📊 *Bước 3/3* — Excel đã sẵn sàng! 🎉');

    // Summary
    await bot.sendMessage(chatId, buildSummary(profile, jobs), { parse_mode: 'Markdown' });

    // Send file
    await bot.sendChatAction(chatId, 'upload_document');
    await bot.sendDocument(chatId, filePath, {
      caption: `📁 *Job Hunt Results*\n${jobs.length} jobs | ${new Date().toLocaleDateString('vi-VN')}`,
      parse_mode: 'Markdown',
    });

    // Cleanup
    fs.unlink(filePath, () => {});
    logger.info(`✅ Done for chat ${chatId}: ${jobs.length} jobs`);

  } catch (err) {
    logger.error(`Pipeline error: ${err.message}`);
    await bot.sendMessage(chatId,
      `❌ *Có lỗi xảy ra:*\n\`${err.message}\`\n\nThử lại bằng cách gửi CV nhé!`,
      { parse_mode: 'Markdown' }
    );
  } finally {
    userState.delete(chatId);
  }
}

// ─── Command Handlers ─────────────────────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const name = msg.from?.first_name || 'bạn';
  await bot.sendMessage(msg.chat.id,
    `👋 Chào *${name}*!\n\n` +
    `🤖 Tôi là *Job Hunter Bot* — tự động tìm việc IT từ CV của bạn.\n\n` +
    `*Cách dùng:*\n` +
    `1️⃣ Gửi file CV (PDF) hoặc paste text CV\n` +
    `2️⃣ Bot phân tích CV → tìm job từ 10 nguồn VN\n` +
    `3️⃣ Nhận file Excel với danh sách việc làm\n\n` +
    `*Nguồn tìm kiếm:*\n` +
    `ITviec • TopDev • VietnamWorks • CareerViet\n` +
    `123Job • JobsGO • Glints • LinkedIn • TopCV • TimViecNhanh\n\n` +
    `📎 *Gửi CV đi thôi!*`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(msg.chat.id,
    `*📖 Hướng dẫn sử dụng:*\n\n` +
    `• Gửi file *PDF* chứa CV\n` +
    `• Hoặc paste *text* CV trực tiếp vào chat\n` +
    `• Dùng lệnh /search <keyword> để tìm nhanh\n` +
    `• /status để xem trạng thái hiện tại\n\n` +
    `*⚙️ Bot dùng:*\n` +
    `• DeepSeek AI để phân tích CV\n` +
    `• Scrape 10 nguồn tuyển dụng VN\n` +
    `• Xuất file Excel đẹp có filter/sort`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/status/, async (msg) => {
  const state = userState.get(msg.chat.id);
  const text = state === 'processing'
    ? '⏳ Bot đang xử lý CV của bạn, xin chờ...'
    : '✅ Bot đang rảnh, gửi CV đi!';
  await bot.sendMessage(msg.chat.id, text);
});

bot.onText(/\/search (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (userState.get(chatId) === 'processing') {
    await bot.sendMessage(chatId, '⏳ Đang xử lý rồi, chờ xíu nhé!');
    return;
  }
  const keyword = match[1].trim();
  const fakeProfile = {
    title: keyword,
    level: 'middle',
    search_keywords: keyword.split(' ').slice(0, 5),
    skills: keyword.split(' '),
    name: '',
    summary: '',
  };
  await bot.sendMessage(chatId, `🔍 Tìm kiếm: *${keyword}*`, { parse_mode: 'Markdown' });
  await processCVPipeline(chatId, `Job search: ${keyword}`);
});

// ─── Document Handler (PDF) ───────────────────────────────────────────────────
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;

  if (userState.get(chatId) === 'processing') {
    await bot.sendMessage(chatId, '⏳ Đang xử lý CV khác, chờ xíu nhé!');
    return;
  }

  const doc = msg.document;
  if (!doc.mime_type?.includes('pdf') && !doc.file_name?.endsWith('.pdf')) {
    await bot.sendMessage(chatId,
      '⚠️ Hiện tại chỉ hỗ trợ *file PDF*.\nBạn cũng có thể paste text CV trực tiếp vào chat nhé!',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (doc.file_size > 10 * 1024 * 1024) {
    await bot.sendMessage(chatId, '❌ File quá lớn (>10MB). Vui lòng nén hoặc gửi file nhỏ hơn.');
    return;
  }

  await bot.sendMessage(chatId, '📄 Nhận được CV! Đang đọc file...', { parse_mode: 'Markdown' });

  try {
    const fileInfo = await bot.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    let cvText;
    try {
      const parsed = await pdfParse(buffer);
      cvText = parsed.text;
    } catch {
      cvText = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t\u00C0-\u024F]/g, ' ');
    }

    if (!cvText || cvText.trim().length < 50) {
      await bot.sendMessage(chatId, '⚠️ Không đọc được nội dung PDF. Bạn thử paste text CV trực tiếp nhé!');
      return;
    }

    logger.info(`📄 CV extracted: ${cvText.length} chars from ${doc.file_name}`);
    await processCVPipeline(chatId, cvText);

  } catch (err) {
    logger.error(`PDF read error: ${err.message}`);
    await bot.sendMessage(chatId, `❌ Lỗi đọc file: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
});

// ─── Text Message Handler (paste CV text) ────────────────────────────────────
bot.on('message', async (msg) => {
  if (!msg.text) return;
  if (msg.text.startsWith('/')) return; // ignore commands

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (userState.get(chatId) === 'processing') {
    await bot.sendMessage(chatId, '⏳ Đang xử lý rồi, chờ kết quả nhé!');
    return;
  }

  // Only process if text looks like a CV (>200 chars)
  if (text.length < 200) {
    await bot.sendMessage(chatId,
      '👋 Gửi *file PDF CV* hoặc *paste text CV* (>200 ký tự) để tôi tìm việc cho bạn!\n\nDùng /help để xem hướng dẫn.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await bot.sendMessage(chatId, '📝 Nhận được CV text! Bắt đầu xử lý...');
  await processCVPipeline(chatId, text);
});

// ─── Error handling ───────────────────────────────────────────────────────────
bot.on('polling_error', (err) => {
  logger.error(`Polling error: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});

logger.info('🚀 Job Hunter Bot is running!');
logger.info('📡 Waiting for CV uploads...');
