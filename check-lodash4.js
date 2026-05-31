#!/usr/bin/env node
/**
 * check-lodash4.js  v2
 * lodash 3→4 破壊的変更を検出する。
 * - vipstarcoin-lib.js（ビルドアーティファクト）は対象外
 * - コメント行（// または * で始まる）は除外
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BREAKING = [
  { old: '_.any', rep: '_.some' },
  { old: '_.all', rep: '_.every' },
  { old: '_.contains', rep: '_.includes' },
  { old: '_.include', rep: '_.includes' },
  { old: '_.pluck', rep: '_.map(col, key)' },
  { old: '_.where', rep: '_.filter' },
  { old: '_.findWhere', rep: '_.find' },
  { old: '_.rest', rep: '_.tail' },
  { old: '_.object', rep: '_.zipObject' },
  { old: '_.compose', rep: '_.flowRight' },
  { old: '_.indexBy', rep: '_.keyBy' },
  { old: '_.sortByOrder', rep: '_.orderBy' },
  { old: '_.trimLeft', rep: '_.trimStart' },
  { old: '_.trimRight', rep: '_.trimEnd' },
  { old: '_.trunc', rep: '_.truncate' },
  { old: '_.pairs', rep: '_.toPairs' },
  { old: '_.callback', rep: '_.iteratee' },
];

// ビルドアーティファクト（再生成されるファイル）は除外
const EXCLUDE_FILES = new Set([
  'vipstarcoin-lib.js',
  'vipstarcoin-lib.min.js',
]);

const TARGET_DIRS = ['lib', 'test'];

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files = files.concat(walkFiles(full));
    } else if (e.isFile() && e.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const root = process.cwd();
let allFiles = [];
for (const d of TARGET_DIRS) {
  allFiles = allFiles.concat(walkFiles(path.join(root, d)));
}
// index.js もチェック（ただしビルドアーティファクトは除く）
const rootJs = path.join(root, 'index.js');
if (fs.existsSync(rootJs)) allFiles.push(rootJs);

// ビルドアーティファクト除外
allFiles = allFiles.filter(f => !EXCLUDE_FILES.has(path.basename(f)));

let totalHits = 0;
const report = [];

for (const file of allFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const fileHits = [];

  for (const item of BREAKING) {
    const pattern = new RegExp(item.old.replace('.', '\\.') + '[\\s\\.(]', 'g');
    lines.forEach((rawLine, idx) => {
      // コメント行はスキップ（行の実コード部分のみチェック）
      const codePart = rawLine.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
      if (pattern.test(codePart)) {
        fileHits.push({
          line: idx + 1,
          text: rawLine.trim(),
          old: item.old,
          rep: item.rep
        });
        totalHits++;
      }
    });
  }

  if (fileHits.length > 0) {
    report.push({ file: path.relative(root, file), hits: fileHits });
  }
}

if (totalHits === 0) {
  console.log('✅  lodash 4.x 破壊的変更の該当箇所なし');
  process.exit(0);
}

console.log(`\n⚠️  lodash 3→4 要修正箇所: ${totalHits} 件\n`);
console.log('='.repeat(60));
for (const r of report) {
  console.log(`\n📄 ${r.file}`);
  for (const h of r.hits) {
    console.log(`  L${h.line}: ${h.text}`);
    console.log(`         ${h.old}  →  ${h.rep}`);
  }
}
console.log('\n' + '='.repeat(60));
console.log('node fix-lodash4-apply.js で一括修正できます。');
process.exit(1);
