'use strict';
var BN = require('./bn');
var BufferUtil = require('../util/buffer');
var ec = require('elliptic').curves.secp256k1;
var ecPoint = ec.curve.point.bind(ec.curve);
// NOTE: elliptic 6.x では pointFromX(x, odd) の順序。
//       elliptic 3.x は pointFromX(odd, x) だったので引数順が逆。
var ecPointFromX = ec.curve.pointFromX.bind(ec.curve);

var Point = function Point(x, y, isRed) {
  // FIX: elliptic 6.x は x=0 / y=0 / 無効な座標に対して 'invalid point' を投げる。
  //      validate() の独自メッセージに到達できないため、事前チェックで補う。
  if (x && typeof x.cmp === 'function' && x.cmp(BN.Zero) === 0) {
    throw new Error('Invalid x,y value for curve, cannot equal 0.');
  }
  if (y && typeof y.cmp === 'function' && y.cmp(BN.Zero) === 0) {
    throw new Error('Invalid x,y value for curve, cannot equal 0.');
  }
  var point;
  try {
    point = ecPoint(x, y, isRed);
  } catch (e) {
    throw new Error('Point does not lie on the curve');
  }
  point.validate();
  return point;
};
Point.prototype = Object.getPrototypeOf(ec.curve.point(null, null));

Point.fromX = function fromX(odd, x) {
  // FIX: x が string の場合も含め BN に変換してゼロチェックする。
  //      elliptic 6.x は x=0 に対して 'invalid point' を内部で投げるため、
  //      validate() の独自メッセージに到達できない。事前チェックで補う。
  var xBN = (x && typeof x.cmp === 'function') ? x : new BN(x, 16);
  if (xBN.isZero()) {
    throw new Error('Invalid x,y value for curve, cannot equal 0.');
  }
  var point;
  try {
    // FIX: elliptic 6.x は pointFromX(x, odd)。3.x は (odd, x) だった。
    point = ecPointFromX(x, odd);
  } catch (e) {
    throw new Error('Point does not lie on the curve');
  }
  point.validate();
  return point;
};

Point.getG = function getG() {
  return ec.curve.g;
};

Point.getN = function getN() {
  return new BN(ec.curve.n.toArray());
};

Point.prototype._getX = Point.prototype.getX;

Point.prototype.getX = function getX() {
  return new BN(this._getX().toArray());
};

Point.prototype._getY = Point.prototype.getY;

Point.prototype.getY = function getY() {
  return new BN(this._getY().toArray());
};

Point.prototype.validate = function validate() {
  if (this.isInfinity()) {
    throw new Error('Point cannot be equal to Infinity');
  }

  if (this.getX().cmp(BN.Zero) === 0 || this.getY().cmp(BN.Zero) === 0) {
    throw new Error('Invalid x,y value for curve, cannot equal 0.');
  }

  // FIX: elliptic 6.x は点座標を red BN (Montgomery 形式) で格納するため、
  //      p2.y.cmp(this.y) は red BN 同士の直接比較になり正しく動作しない。
  //      getY() 経由で通常の BN に変換してから比較する。
  //      また ecPointFromX が 'invalid point' を投げる場合も適切なエラーに変換。
  try {
    var p2 = ecPointFromX(this.getX(), this.getY().isOdd());
    if (p2.getY().cmp(this.getY()) !== 0) {
      throw new Error('Invalid y value for curve.');
    }
  } catch (e) {
    if (e.message === 'Invalid y value for curve.') {
      throw e;
    }
    throw new Error('Point does not lie on the curve');
  }

  var xValidRange = (this.getX().gt(BN.Minus1) && this.getX().lt(Point.getN()));
  var yValidRange = (this.getY().gt(BN.Minus1) && this.getY().lt(Point.getN()));
  if (!xValidRange || !yValidRange) {
    throw new Error('Point does not lie on the curve');
  }

  if (!(this.mul(Point.getN()).isInfinity())) {
    throw new Error('Point times N must be infinity');
  }

  return this;
};

Point.pointToCompressed = function pointToCompressed(point) {
  var xbuf = point.getX().toBuffer({ size: 32 });
  var ybuf = point.getY().toBuffer({ size: 32 });
  var odd = ybuf[ybuf.length - 1] % 2;
  var prefix = odd ? Buffer.from([0x03]) : Buffer.from([0x02]);
  return BufferUtil.concat([prefix, xbuf]);
};

module.exports = Point;
