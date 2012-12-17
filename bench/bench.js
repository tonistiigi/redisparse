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
  this.return_buffers = (opt && opt.return_buffers) || false
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

  send(socket, this.args)
  send(socket, ['quit'])

  var buffers = []
  socket.on('data', function (d) {
    buffers.push(d)
  })

  var self = this
  socket.on('end', function() {
    // Need to get the last +OK\r\n out of the response.
    // Probably a bad idea.
    var last = buffers.length - 1
    buffers[last] = buffers[last].slice(0, buffers[last].length - 5)
    if(!buffers[last].length) buffers.pop()
    var start = new Date
    for (var i = 0; i < self.num_requests; i++) {
      for (var b = 0; b < buffers.length; b++) {
        parser.execute(buffers[b])
      }
    }
    console.log(new Date - start)

  })


}


var small_str = "1234"
var small_buf = new Buffer(small_str)
var large_str = new Array(4097).join("-")
var large_buf = new Buffer(large_str)

var t = new Test(['PING'])
t.run()
