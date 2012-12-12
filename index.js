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
  this._size = 0
  this._skip = 0
  this._multibulk = null
}
inherits(Parser, EventEmitter)

/**
 * Events:
 * - reply
 * - reply error (redis error)
 * - error (parser error)
 */

Parser.prototype.execute = function (data) {
  this._data = data
  this._offset = Math.min(this._skip, this._data.length)
  this._skip -= this._offset

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
    else if (this._state === BULK_DATA) {
      if (this._data.length - this._offset < this._size) { // Partial.
        this.emit('reply partial', this._data.slice(this._offset))
        this._size -= this._data.length - this._offset
        this._offset = this._data.length
      }
      else {
        this._reply(this._data.slice(this._offset, this._offset += this._size))
        this._offset += 2
        if (this._offset > this._data.length) {
          this._skip = this._offset - this._data.length
        }
      }
    }
    else if (this._untilCRLF()) {
      if (this._state === SINGLE) {
        this._reply(this._line)
      }
      else if (this._state === INTEGER) {
        this._reply(+this._line)
      }
      else if (this._state === ERROR) {
        this._reply(this._line, 'reply error')
      }
      else if (this._state === BULK) {
        this._size = +this._line
        if (this._size === -1) {
          this._reply(null)
        }
        else {
          this._state = BULK_DATA
        }
      }
      else if (this._state === MULTI_BULK) {
        var count = +this._line
        if (c > 0) {
          this._multibulk = new Multibulk(count)
          this._state = START
        }
        else if (c === 0) {
          this._reply([])
        }
        else { // -1
          this._reply(null)
        }
      }
    }
  }
}

Parser.prototype._reply = function (reply, type) {
  if (this._multibulk) {
  }
  this.emit(type || 'reply', reply)
  this._state = START
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
      this._offset++
      if (this._offset === this._data.length) { // No more data.
        if (this._data[this._offset - 1] === 0xd) this._cr = true // Remember last <CR>

        return
      }
    }
    this._offset += 2
  }
  return this._line
}

function Multibulk(count) {
  this.count = count
  this.items = []
}

exports.Parser = Parser