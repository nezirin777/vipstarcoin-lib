'use strict';
/**
 * test/mocha-setup.js
 *
 * mocha 起動時に最初に読み込まれる共通セットアップ。
 *
 * sinon 9+ で削除された sinon.sandbox API を互換シムで復元する。
 * テストファイル側は変更不要。
 *
 *   sinon.sandbox.create()  →  sinon.createSandbox()
 */
var sinon = require('sinon');

if (!sinon.sandbox) {
  sinon.sandbox = {
    create: function(opts) {
      return sinon.createSandbox(opts);
    }
  };
}
