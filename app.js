pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';

console.log('✅ app.js loaded');

document.getElementById('pdf-upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function () {
    const typedArray = new Uint8Array(this.result);
    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
    const allLines = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const lines = content.items.map(item => item.str.trim()).filter(t => t.length > 0);
      allLines.push(...lines);
    }

    const quotes = extractQuotes(allLines);

    renderTable(quotes);
  };
  reader.readAsArrayBuffer(file);
});

function extractQuotes(lines) {
  const results = [];
  let day = 1;

  for (let i = 0; i < lines.length - 6; i++) {
    const person = lines[i];
    const info = lines[i + 1];
    const en = lines[i + 2];
    const ja1 = lines[i + 3];
    const ja2 = lines[i + 4];
    const year = lines[i + 5];
    const serial = lines[i + 6];

    const isValid = (
      year === '2026' &&
      /^\d{3}$/.test(serial) &&
      /^[（(][0-9B.C.～年・）\s\-～]+/.test(info) &&
      /[a-zA-Z]/.test(en) &&
      /[ぁ-んァ-ン一-龯]/.test(ja1 + ja2)
    );

    if (isValid) {
      const ja = (ja1 + ' ' + ja2).replace(/\s+/g, ' ').trim();
      results.push({ day: `1/${day}`, ja, en, author: `${person}${info}` });
      i += 6;
    } else {
      results.push({ day: `1/${day}`, ja: 'error', en: 'error', author: 'error' });
    }

    day++;
  }

  return results;
}

// 🔄 表形式で出力、表示順の切り替え付き
function renderTable(data) {
  const output = document.getElementById('output');
  output.innerHTML = '';

  const select = document.createElement('select');
  select.id = 'order-select';
  ['日本語・英語・出典', '日本語のみ', '英語のみ', '出典のみ'].forEach(label => {
    const option = document.createElement('option');
    option.value = label;
    option.textContent = label;
    select.appendChild(option);
  });

  select.addEventListener('change', () => renderTable(data)); // 再描画

  output.appendChild(select);

  const table = document.createElement('table');
  table.border = '1';
  table.cellPadding = '5';

  const header = document.createElement('tr');
  header.innerHTML = `<th>日付</th><th>1</th><th>2</th><th>3</th>`;
  table.appendChild(header);

  const mode = document.getElementById('order-select')?.value || '日本語・英語・出典';

  data.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${entry.day}</td>`;

    switch (mode) {
      case '日本語のみ':
        row.innerHTML += `<td>${entry.ja}</td><td></td><td></td>`;
        break;
      case '英語のみ':
        row.innerHTML += `<td>${entry.en}</td><td></td><td></td>`;
        break;
      case '出典のみ':
        row.innerHTML += `<td>${entry.author}</td><td></td><td></td>`;
        break;
      default:
        row.innerHTML += `<td>${entry.ja}</td><td>${entry.en}</td><td>${entry.author}</td>`;
    }

    table.appendChild(row);
  });

  output.appendChild(table);
}
