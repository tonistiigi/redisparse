// Based on https://github.com/mranney/node_redis/blob/master/multi_bench.js
var net = require('net')
var argv = require('optimist').argv
var parsers

switch (argv.parser) {
  case 'node_redis':
    parsers = require('./comparison/node_redis')
  break;
  case 'hiredis':
    parsers = require('./comparison/hiredis')
  break;
  case 'node_redis_old':
    parsers = require('./comparison/node_redis_old')
  break;
  default:
    parsers = require('../')
}


function send(socket, args) {
  socket.write('*' + args.length + '\r\n')
  for (var i = 0; i < args.length; i++) {
    socket.write('$' + (args[i] instanceof Buffer ? args[i].length : Buffer.byteLength(args[i])) + '\r\n')
    socket.write(args[i])
    socket.write('\r\n')
  }
}


function run(name, args, opt, cb) {
  var return_buffers = opt.return_buffers || false
  var num_requests = opt.num_request || 1e6

  var socket = net.connect(6379)
  var parser = new parsers.Parser({return_buffers: return_buffers})

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

  send(socket, args)
  send(socket, ['quit'])

  var buffers = []
  socket.on('data', function (d) {
    buffers.push(d)
  })

  socket.on('end', function() {
    // Need to get the last +OK\r\n out of the response.
    // Probably a bad idea.
    var last = buffers.length - 1
    buffers[last] = buffers[last].slice(0, buffers[last].length - 5)
    if(!buffers[last].length) buffers.pop()
    run()

  })

  function run() {
    var result = {}

    if (argv.profiler) {
      require('./profiler').start()
    }
    var start = new Date
    for (var i = 0; i < num_requests; i++) {
      for (var b = 0; b < buffers.length; b++) {
        parser.execute(buffers[b])
      }
    }
    result[parsers.name] = {time: new Date - start}

    if (argv.profiler) {
      result[parsers.name]['profiler'] = require('./profiler').end()
    }
    cb(name, result)
  }

}


var small_str = "1234"
var small_buf = new Buffer(small_str)
var large_str = new Array(4097).join("-")
var large_buf = new Buffer(large_str)


var tests = {}
tests.ping = [['ping']]
tests.hello = [['get', 'hello']]



function runTests(keys) {
  while (true) {
    if (!keys.length) return stringify.end()
    var key = keys.shift()
    var test = tests[key]
    if (argv.filter && !new RegExp(argv.filter).test(key)) continue
    else break
  }
  run(key, test[0], test[1] || {}, function(){
    stringify.write(arguments)
    runTests(keys)
  })
}

var stringify = require('JSONStream').stringifyObject()
stringify.pipe(process.stdout)
runTests(Object.keys(tests))
