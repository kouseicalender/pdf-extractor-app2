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

    const quotes = extractSmartQuotes(allLines);
    renderTable(quotes);
  };
  reader.readAsArrayBuffer(file);
});

// ✅ 柔軟な名言ブロック判定
function extractSmartQuotes(lines) {
  const results = [];
  let day = 1;

  for (let i = 6; i < lines.length; i++) {
    const year = lines[i - 1];
    const serial = lines[i];

    if (year === '2026' && /^\d{3}$/.test(serial)) {
      // 6行前〜2行前までを見て柔軟に構成を判定
      const window = lines.slice(i - 6, i - 1);
      let person = '', info = '', en = '', ja = '', matched = false;

      for (let j = 0; j <= 2; j++) {
        const maybePerson = window[j];
        const maybeInfo = window[j + 1];
        const maybeEn = window[j + 2];
        const maybeJa1 = window[j + 3];
        const maybeJa2 = window[j + 4];

        const isValidInfo = /^[（(][0-9B.C.～年・）\s\-～]+/.test(maybeInfo);
        const isEn = /[a-zA-Z]/.test(maybeEn);
        const isJa = /[ぁ-んァ-ン一-龯]/.test(maybeJa1 + maybeJa2);

        if (isValidInfo && isEn && isJa) {
          person = maybePerson;
          info = maybeInfo;
          en = maybeEn;
          ja = (maybeJa1 + ' ' + maybeJa2).replace(/\s+/g, ' ').trim();
          matched = true;
          break;
        }
      }

      if (matched) {
        results.push({
          day: `1/${day}`,
          ja,
          en,
          author: `${person}${info}`
        });
      } else {
        results.push({
          day: `1/${day}`,
          ja: 'error',
          en: 'error',
          author: 'error'
        });
      }

      day++;
    }
  }

  return results;
}

// ✅ 表形式で表示（順序切り替え付き）
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
