var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

var START = 0x1
var SINGLE = 0x2
var ERROR = 0x3
var INTEGER = 0x4
var BULK = 0x5
var BULK_DATA = 0x6
var MULTI_BULK = 0x7


function Parser(options) {
  this.options = options || {}
  this._state = START
  this._offset = 0
  this._data = null

}
inherits(Parser, EventEmitter)

/**
 * Events:
 * - reply
 * - reply error (redis error)
 * - error (parser error)
 */

Parser.prototype.execute = function (data) {
  var length = data.length
  this._offset = 0
  this._data = data

  while (this._offset < this._data.length) {
    if (this._state === START) {
      switch (this._data[this._offset++]) {
        case 43: // +
          this._state = SINGLE
        break;
        case 58: // :
          this._state = INTEGER
        break;
        case 45: // -
          this._state = ERROR
        break;
        case 36: // $
          this._state = BULK
        break;
        case 42: // *
          this._state = MULTI_BULK
        break;
        default:
          this.emit('error', new Error('Expecting one of +-:$*'))
      }
    }
    else if (this._state === SINGLE) {
      this.emit('reply', 'test')
      return
    }
    else {
      this._offset++
    }
  }
}

exports.Parser = Parser