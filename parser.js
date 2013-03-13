var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var ArrayDecoder = require('array_decoder').ArrayDecoder

var START = 0x1
var SINGLE = 0x2
var ERROR = 0x3
var INTEGER = 0x4
var BULK = 0x5
var BULK_DATA = 0x6
var MULTI_BULK = 0x7

function Parser(options) {
  this.name = exports.name
  this.options = options || {}
  this._state = START
  this._line = ''
  this._cr = false
  this._size = 0
  this._skip = 0
  this._multibulk = null
  this._array_decoder = new ArrayDecoder(
    this.options.return_buffers ? 'buffer' : 'string')
  this._string_decoder = null
  this._is_string_decoder = false
}
inherits(Parser, EventEmitter)

/**
 * Events:
 * - reply
 * - reply error (redis error)
 * - error (parser error)
 */

Parser.prototype.execute = function (data) {
  var offset = Math.min(this._skip, data.length)
  this._skip -= offset

  while (offset < data.length) {
    if (this._state === START) {
      this._line = ''
      switch (data[offset++]) {
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
      if (data.length - offset < this._size) { // Partial.
        var buffer = data.slice(offset)
        if (this.options.return_buffers) {
          this._reply_partial(buffer)
        }
        else {
          if (!this._string_decoder) {
            this._string_decoder = new (require('string_decoder').StringDecoder)
          }
          this._is_string_decoder = true
          this._reply_partial(this._string_decoder.write(buffer))
        }
        this._size -= data.length - offset
        offset = data.length
      }
      else {
        if (this.options.return_buffers) {
          this._reply(data.slice(offset, offset += this._size))
        }
        else {
          if (this._is_string_decoder) {
            this._is_string_decoder = false
            this._reply(this._string_decoder.write(
              data.slice(offset, offset += this._size)))
          }
          else {
            this._reply(data.parent.utf8Slice(
              offset + data.offset,
              (offset += this._size) + data.offset))
          }

        }
        offset += 2
        if (offset > data.length) {
          this._skip = offset - data.length
        }
      }
    }
    else {
      if (this._cr && data[offset] === 0xa) {
        this._cr = false
        this._line = this._line.substring(0, this._line.length - 1) // Remove buffered <CR>
        offset++
      }
      else {
        this._cr = false
        while (data[offset] !== 0xd || data[offset + 1] !== 0xa) {
          this._line += String.fromCharCode(data[offset])
          if (offset + 1 === data.length) { // No more data.
            if (data[offset] === 0x0d) this._cr = true // Remember last <CR>
            return
          }
          offset++
        }
        offset += 2
      }

      if (this._state === SINGLE) {
        this._reply(this._line)
      }
      else if (this._state === INTEGER) {
        if (this.options.return_buffers) {
          this._reply(new Buffer(this._line))
        }
        else {
          this._reply(+this._line)
        }
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
        if (count > 0) {
          this._multibulk = new Multibulk(count, this._multibulk)
          this._state = START
        }
        else if (count === 0) {
          this._reply([])
        }
        else { // -1
          this._reply(null)
        }
      }
    }
  }
}

Parser.prototype._reply_partial = function (reply, type) {
  if (this._multibulk) {
    this._multibulk.items.push(reply)
    reply = this._array_decoder.write(this._multibulk.flush())
    if (!reply) return
  }
  this.emit('reply partial', reply)
}

Parser.prototype._reply = function (reply, type) {
  this._state = START
  if (this._multibulk) {
    this._multibulk.items.push(reply)
    do {
      var multibulk = this._multibulk // remember after switch
      if (--this._multibulk.count) return
    } while (this._multibulk = this._multibulk.parent)
    reply = this._array_decoder.write(multibulk.items, true)
  }
  this.emit(type || 'reply', reply)
}

function Multibulk(count, parent) {
  this.count = count
  this.parent = parent // parent may not be good pattern because theres only 2 levels
  this.items = []
  if (parent) {
    parent.items.push(this.items)
  }
}

Multibulk.prototype.flush = function() { // Pull current items out and clear.
  var out = this.parent ? this.parent.items : this.items
  this.items = []
  if (this.parent) this.parent.items = [this.items]
  return out
}

exports.Parser = Parser

exports.name = 'redisparse'