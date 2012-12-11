var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

function Parser(options) {
  this.options = options || {}
}
inherits(Parser, EventEmitter)

/**
 * Events:
 * - reply
 * - reply error (redis error)
 * - error (parser error)
 */

Parser.prototype.execute = function (data) {

}

exports.Parser = Parser