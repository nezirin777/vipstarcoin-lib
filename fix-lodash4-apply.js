#!/usr/bin/env node
/**
 * fix-lodash4-apply.js
 * lib/ と test/ 内の lodash 3→4 破壊的変更を一括修正する。
 * vipstarcoin-lib.js（ビルドアーティファクト）は対象外。
 *
 * 使い方:
 *   cd ~/vipstarcoin-lib
 *   node fix-lodash4-apply.js
 *   node check-lodash4.js   # 0件になることを確認
 */
'use strict';

const fs = require('fs');
const path = require('path');

// 修正対象ファイル（ビルドアーティファクトと networks.js は除外）
const TARGET_FILES = [
  'lib/encoding/base58.js',
  'lib/hdprivatekey.js',
  'lib/hdpublickey.js',
  'lib/transaction/transaction.js',
  'test/transaction/input/multisig.js',
  'test/transaction/input/multisigscripthash.js',
];

// lodash 3→4 置換ルール
// \b で単語境界を使い、_.allKeys 等への誤マッチを防ぐ
const REPLACEMENTS = [
  { pattern: /\b_\.any\(/g, replacement: '_.some(', label: '_.any → _.some' },
  { pattern: /\b_\.all\(/g, replacement: '_.every(', label: '_.all → _.every' },
  { pattern: /\b_\.contains\(/g, replacement: '_.includes(', label: '_.contains → _.includes' },
];

const root = process.cwd();
let totalFixed = 0;

for (const relPath of TARGET_FILES) {
  const fullPath = path.join(root, relPath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP (not found): ${relPath}`);
    continue;
  }

  let src = fs.readFileSync(fullPath, 'utf8');
  let changed = 0;
  const details = [];

  for (const { pattern, replacement, label } of REPLACEMENTS) {
    const matches = (src.match(pattern) || []).length;
    if (matches > 0) {
      src = src.replace(pattern, replacement);
      changed += matches;
      details.push(`${matches}x ${label}`);
    }
  }

  if (changed > 0) {
    fs.writeFileSync(fullPath, src, 'utf8');
    console.log(`✅ ${relPath}  (${details.join(', ')})`);
    totalFixed += changed;
  } else {
    console.log(`   ${relPath}  変更なし`);
  }
}

console.log(`\n合計 ${totalFixed} 箇所を修正しました。`);
console.log('確認: node check-lodash4.js');
