import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{1,4}:[0-5]\d\.\d{3}$/.test(value)) {
    throw new Error('Use M:SS.mmm for timestamps');
  }
  const [minutes, seconds, ms] = value.split(/[:.]/).map(Number);
  return minutes * 60000 + seconds * 1000 + ms;
}

function vttTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor(ms / 60000) % 60;
  const seconds = Math.floor(ms / 1000) % 60;
  return [hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(':') +
    '.' + String(ms % 1000).padStart(3, '0');
}

export function makeSheet(input, mode = 'labels') {
  if (!['labels', 'chapters'].includes(mode)) throw new Error('Use labels or chapters');
  const duration = timestamp(input.duration);
  if (!duration || !Array.isArray(input.cuts) || input.cuts.length === 0) {
    throw new Error('Include a positive duration and at least one cut');
  }
  let previousEnd = 0;
  const lines = input.cuts.map(({start, end, label}, index) => {
    const from = timestamp(start);
    const to = timestamp(end);
    if (to > duration || from >= to || from < previousEnd) {
      throw new Error('Cut ' + (index + 1) + ' overlaps, runs backwards, or goes past the end');
    }
    if (typeof label !== 'string' || !label.trim() || /[\t\r\n]/.test(label) || label.includes('-->')) {
      throw new Error('Cut ' + (index + 1) + ' needs a plain single-line label');
    }
    const text = label.trim();
    previousEnd = to;
    if (mode === 'labels') return [(from / 1000).toFixed(3), (to / 1000).toFixed(3), text].join('\t');
    const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return vttTime(from) + ' --> ' + vttTime(to) + '\n' + escaped;
  });
  return mode === 'labels' ? lines.join('\n') + '\n' : 'WEBVTT\n\n' + lines.join('\n\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [file, mode] = process.argv.slice(2);
    if (!file) throw new Error('Usage: node cuts.mjs sheet.json [labels|chapters]');
    process.stdout.write(makeSheet(JSON.parse(fs.readFileSync(file, 'utf8')), mode));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
