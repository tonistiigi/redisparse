// Based on https://github.com/mranney/node_redis/blob/master/multi_bench.js
var net = require('net')
var Parser = require('../').Parser


function send(socket, args) {
  socket.write('*' + args.length + '\r\n')
  for (var i = 0; i < args.length; i++) {
    socket.write('$' + (args[i] instanceof Buffer ? args[i].length : Buffer.byteLength(args[i])) + '\r\n')
    socket.write(args[i])
    socket.write('\r\n')
  }
}


function Test(args, opt) {
  this.args = args
  this.return_buffers = opt.return_buffers || false
  this.num_requests = 1e6
}

Test.prototype.run = function() {
  var socket = net.connect(6379)
  var parser = new Parser({return_buffers: this.return_buffers})

  var replies = 0
  parser.on('reply', function(d) {
    replies++ // Increment in case some clever VM optimizes these calls out.
  })

  parser.on('reply partial', function(d) {
    replies++
  })

  parser.on('reply error', function(e) {
    throw(e) // none of the tests should return error.
  })

  parser.on('error', function(e) {
    throw(e)
  })

  socket.on('data', parser.execute.bind(parser))

  send(socket, this.args)

}


var small_str = "1234"
var small_buf = new Buffer(small_str)
var large_str = new Array(4097).join("-")
var large_buf = new Buffer(large_str)


