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
  this.state = START
  this.offset = 0
  this.data = null
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
  this.offset = 0
  this.data = data

  while (this.offset < this.data.length) {
    if (this.state === START) {
      switch (this.data[this.offset++]) {
        case 43: // +
          this.state = SINGLE
        break;
        case 58: // :
          this.state = INTEGER
        break;
        case 45: // -
          this.state = ERROR
        break;
        case 36: // $
          this.state = BULK
        break;
        case 42: // *
          this.state = MULTI_BULK
        break;
        default:
          this.emit('error', new Error('Expecting one of +-:$*'))
      }
    }
    else if (this.state === SINGLE) {
      this.emit('reply', 'test')
      return
    }
    else {
      this.offset++
    }
  }
}

exports.Parser = Parser