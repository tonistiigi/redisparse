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
  this._line = ''
  this._cr = false
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
      this._line = ''
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
      if (this._untilCRLF()) {
        this.emit('reply', this._line)
        this._state = START
      }
    }
    else {
      this._offset++
    }
  }
}

Parser.prototype._untilCRLF = function () {
  if (this._cr && this._data[this._offset] === 0xa) {
    this._cr = false
    this._line = this._line.substring(0, this._line.length - 1) // Remove buffered <CR>
    this._offset++
  }
  else {
    while (this._data[this._offset] !== 0xd || this._data[this._offset + 1] !== 0xa) {
      this._line += String.fromCharCode(this._data[this._offset])
      if (this._offset + 1 === this._data.length) { // No more data.
        if (this._data[this._offset] === 0xd) this._cr = true // Remember last <CR>
        return
      }
      this._offset++
    }
    this._offset += 2
  }
  return this._line
}

exports.Parser = Parser