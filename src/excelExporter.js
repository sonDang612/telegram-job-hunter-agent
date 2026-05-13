const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

async function exportToExcel(jobs, profile, outputDir = './output') {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `jobs_${profile.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'result'}_${timestamp}.xlsx`;
  const filepath = path.join(outputDir, filename);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Job Hunter Bot';
  wb.created = new Date();

  // ── Sheet 1: Jobs ──────────────────────────────────────────────────────────
  const ws = wb.addWorksheet('Jobs Found', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  // Title row
  ws.mergeCells('A1:G1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `🔍 Job Hunt Results — ${profile.title || 'Software Developer'} (${profile.level || ''}) — ${new Date().toLocaleDateString('vi-VN')}`;
  titleCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  // Headers
  const headers = ['#', 'Tên Job', 'Công Ty', 'Range Lương', 'Địa Điểm', 'Nguồn', 'Link'];
  const colWidths = [5, 42, 32, 22, 20, 15, 55];
  const headerColors = {
    '#': 'FF2C3E50',
    'Tên Job': 'FF2C3E50',
    'Công Ty': 'FF2C3E50',
    'Range Lương': 'FF27AE60',
    'Địa Điểm': 'FF2C3E50',
    'Nguồn': 'FF8E44AD',
    'Link': 'FF2C3E50',
  };

  const headerRow = ws.addRow(headers);
  headerRow.height = 24;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColors[h] || 'FF2C3E50' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
    };
    ws.getColumn(i + 1).width = colWidths[i];
  });

  // Source color map
  const sourceColors = {
    ITviec: 'FFFDE8D8',
    TopDev: 'FFE8F5E9',
    VietnamWorks: 'FFFFE0B2',
    CareerViet: 'FFFCE4EC',
    '123Job': 'FFE3F2FD',
    JobsGO: 'FFF3E5F5',
    Glints: 'FFE0F2F1',
    LinkedIn: 'FFECEFF1',
    TopCV: 'FFFFF9C4',
    TimViecNhanh: 'FFEFEBE9',
  };

  // Data rows
  jobs.forEach((job, idx) => {
    const rowData = [
      idx + 1,
      job.title || '',
      job.company || '',
      job.salary || 'Thỏa thuận',
      job.location || '',
      job.source || '',
      { text: job.link || '', hyperlink: job.link || '' },
    ];

    const row = ws.addRow(rowData);
    row.height = 20;

    const bgColor = sourceColors[job.source] || 'FFFAFAFA';
    const isEven = idx % 2 === 0;

    row.eachCell((cell, colNum) => {
      cell.alignment = { vertical: 'middle', wrapText: colNum === 2 };

      // Alternating row background
      if (colNum !== 6) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? bgColor : 'FFFFFFFF' },
        };
      }

      // Source badge
      if (colNum === 6) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.font = { bold: true, size: 9.5, color: { argb: 'FF4A235A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Link column
      if (colNum === 7 && job.link) {
        cell.font = { color: { argb: 'FF1565C0' }, underline: true };
      }

      // Salary highlight if has numbers
      if (colNum === 4 && job.salary && /\d/.test(job.salary)) {
        cell.font = { bold: true, color: { argb: 'FF1A7742' } };
      }

      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });
  });

  // Auto-filter
  ws.autoFilter = { from: 'A2', to: 'G2' };

  // ── Sheet 2: CV Profile Summary ────────────────────────────────────────────
  const ws2 = wb.addWorksheet('CV Profile');
  ws2.getColumn(1).width = 28;
  ws2.getColumn(2).width = 60;

  const profileData = [
    ['📄 CV ANALYSIS SUMMARY', ''],
    ['', ''],
    ['Name', profile.name || 'N/A'],
    ['Target Title', profile.title || 'N/A'],
    ['Level', profile.level || 'N/A'],
    ['Experience', `${profile.experience_years || '?'} years`],
    ['Skills', (profile.skills || []).join(', ')],
    ['Languages', (profile.languages || []).join(', ')],
    ['Industries', (profile.industries || []).join(', ')],
    ['Search Keywords', (profile.search_keywords || []).join(', ')],
    ['Summary', profile.summary || ''],
    ['', ''],
    ['Total Jobs Found', jobs.length],
    ['Sources Used', [...new Set(jobs.map(j => j.source))].join(', ')],
    ['Generated At', new Date().toLocaleString('vi-VN')],
  ];

  profileData.forEach((row, i) => {
    const r = ws2.addRow(row);
    r.height = i === 0 ? 30 : 22;
    if (i === 0) {
      ws2.mergeCells(`A${i + 1}:B${i + 1}`);
      r.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (row[0]) {
      r.getCell(1).font = { bold: true, color: { argb: 'FF34495E' } };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F3F4' } };
      r.getCell(2).alignment = { wrapText: true };
    }
  });

  // ── Sheet 3: Stats ─────────────────────────────────────────────────────────
  const ws3 = wb.addWorksheet('📊 Stats');
  ws3.getColumn(1).width = 22;
  ws3.getColumn(2).width = 14;

  ws3.addRow(['SOURCE', 'JOB COUNT']).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center' };
  });

  const bySrc = {};
  jobs.forEach(j => { bySrc[j.source] = (bySrc[j.source] || 0) + 1; });
  Object.entries(bySrc)
    .sort((a, b) => b[1] - a[1])
    .forEach(([src, cnt]) => {
      const r = ws3.addRow([src, cnt]);
      r.getCell(2).alignment = { horizontal: 'center' };
      const bg = sourceColors[src] || 'FFFAFAFA';
      r.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      });
    });

  ws3.addRow([]);
  const totalRow = ws3.addRow(['TOTAL', jobs.length]);
  totalRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5F5E3' } };
    cell.alignment = { horizontal: 'center' };
  });

  await wb.xlsx.writeFile(filepath);
  logger.info(`✅ Excel saved: ${filepath}`);
  return filepath;
}

module.exports = { exportToExcel };
