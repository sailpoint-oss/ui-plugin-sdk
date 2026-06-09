import * as fs from 'node:fs';

// Usage: node merge-project-log.mjs <existing_html_path> <new_entries_json_path> <output_html_path>

const existingHtmlPath = process.argv[2];
const newEntriesPath = process.argv[3];
const outputHtmlPath = process.argv[4];

if (!existingHtmlPath || !newEntriesPath || !outputHtmlPath) {
  console.error(
    'Usage: node merge-project-log.mjs <existing_html_path> <new_entries_json_path> <output_html_path>',
  );
  process.exit(1);
}

const existingHtml = fs.readFileSync(existingHtmlPath, 'utf8');
const newEntriesData = JSON.parse(fs.readFileSync(newEntriesPath, 'utf8'));

// 1. Parse existing HTML
let preamble = '';
const dateBlocks = new Map();
const glossaryItems = new Map();

// Split by <h2>
const h2Split = existingHtml.split(/(<h2>[\s\S]*?<\/h2>)/i);
preamble = h2Split[0];

for (let i = 1; i < h2Split.length; i += 2) {
  const h2Tag = h2Split[i];
  const content = h2Split[i + 1] || '';
  const h2Match = h2Tag.match(/<h2>([\s\S]*?)<\/h2>/i);
  const h2Text = h2Match ? h2Match[1].trim() : '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(h2Text)) {
    const dateObj = { attendees: '', sections: new Map() };

    const attMatch = content.match(/<p><strong>Attendees:<\/strong>([\s\S]*?)<\/p>/i);
    if (attMatch) dateObj.attendees = attMatch[1].trim();

    const h3Split = content.split(/(<h3>[\s\S]*?<\/h3>)/i);
    for (let j = 1; j < h3Split.length; j += 2) {
      const h3Tag = h3Split[j];
      const secContent = h3Split[j + 1] || '';
      const h3Match = h3Tag.match(/<h3>([\s\S]*?)<\/h3>/i);
      const h3Text = h3Match ? h3Match[1].trim() : '';

      const items = [];
      const liRegex = /<li>([\s\S]*?)<\/li>/gi;
      let liMatch = liRegex.exec(secContent);
      while (liMatch !== null) {
        items.push(liMatch[1].trim());
        liMatch = liRegex.exec(secContent);
      }
      dateObj.sections.set(h3Text, items);
    }
    dateBlocks.set(h2Text, dateObj);
  } else if (h2Text === 'Glossary') {
    const liRegex = /<li>([\s\S]*?)<\/li>/gi;
    let liMatch = liRegex.exec(content);
    while (liMatch !== null) {
      const liContent = liMatch[1].trim();
      const termMatch = liContent.match(/<strong>([\s\S]*?)<\/strong>/i);
      const term = termMatch ? termMatch[1].trim() : liContent;
      glossaryItems.set(term, liContent);
      liMatch = liRegex.exec(content);
    }
  }
}

// 2. Merge new entries
for (const entry of newEntriesData.entries || []) {
  const date = entry.date;
  if (!dateBlocks.has(date)) {
    dateBlocks.set(date, { attendees: '', sections: new Map() });
  }
  const dateObj = dateBlocks.get(date);

  if (entry.attendees && entry.attendees.length > 0) {
    const newAtt = entry.attendees.join(', ');
    if (dateObj.attendees) {
      const existingAtts = dateObj.attendees.split(',').map((s) => s.trim());
      for (const a of entry.attendees) {
        if (!existingAtts.includes(a)) existingAtts.push(a);
      }
      dateObj.attendees = existingAtts.join(', ');
    } else {
      dateObj.attendees = newAtt;
    }
  }

  const mergeSection = (title, newItems) => {
    if (!newItems || newItems.length === 0) return;
    if (!dateObj.sections.has(title)) {
      dateObj.sections.set(title, []);
    }
    const existingItems = dateObj.sections.get(title);

    for (const newItem of newItems) {
      const cleanItem = newItem
        .replace(/^<li>/i, '')
        .replace(/<\/li>$/i, '')
        .trim();
      const textOnly = cleanItem.replace(/<[^>]*>?/gm, '').trim();

      let exists = false;
      for (const exItem of existingItems) {
        const exTextOnly = exItem.replace(/<[^>]*>?/gm, '').trim();
        if (exTextOnly === textOnly) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        existingItems.push(cleanItem);
      }
    }
  };

  mergeSection('Decisions', entry.decisions);
  mergeSection('Open strategic questions', entry.questions);
  mergeSection('Reversals / superseded decisions', entry.reversals);
}

// 3. Merge Glossary
for (const g of newEntriesData.glossary || []) {
  const term = g.term.trim();
  if (!glossaryItems.has(term)) {
    glossaryItems.set(term, `<strong>${term}</strong> — ${g.definition}`);
  }
}

// 4. Generate Output HTML
let outHtml = `${preamble.trim()}\n`;

const sortedDates = Array.from(dateBlocks.keys()).sort((a, b) => b.localeCompare(a));

for (const date of sortedDates) {
  outHtml += `<h2>${date}</h2>\n`;
  const dateObj = dateBlocks.get(date);

  if (dateObj.attendees) {
    outHtml += `<p><strong>Attendees:</strong> ${dateObj.attendees}</p>\n`;
  }

  const sectionOrder = [
    'Decisions',
    'Reversals / superseded decisions',
    'Open strategic questions',
  ];

  for (const title of sectionOrder) {
    if (dateObj.sections.has(title) && dateObj.sections.get(title).length > 0) {
      outHtml += `<h3>${title}</h3>\n<ul>\n`;
      for (const item of dateObj.sections.get(title)) {
        outHtml += `<li>${item}</li>\n`;
      }
      outHtml += `</ul>\n`;
    }
  }

  for (const [title, items] of dateObj.sections.entries()) {
    if (!sectionOrder.includes(title) && items.length > 0) {
      outHtml += `<h3>${title}</h3>\n<ul>\n`;
      for (const item of items) {
        outHtml += `<li>${item}</li>\n`;
      }
      outHtml += `</ul>\n`;
    }
  }
}

if (glossaryItems.size > 0) {
  outHtml += `<h2>Glossary</h2>\n<ul>\n`;
  const sortedTerms = Array.from(glossaryItems.keys()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
  for (const term of sortedTerms) {
    outHtml += `<li>${glossaryItems.get(term)}</li>\n`;
  }
  outHtml += `</ul>\n`;
}

fs.writeFileSync(outputHtmlPath, outHtml);
console.log('Successfully merged project log to', outputHtmlPath);
