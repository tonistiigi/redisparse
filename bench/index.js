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
  var num_requests = opt.num_requests || 1e6

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


var tests = {}
tests.ping = [['ping']]
tests.set_small_str = [['set', 'rpbench_small_str', '1234']]
tests.get_small_str = [['get', 'rpbench_small_str']]
tests.get_small_buf = [['get', 'rpbench_small_str'], {return_buffers: true}]
tests.get_large_str = [['get', 'rpbench_large_str'], {num_requests: 2e5}]
tests.get_large_buf = [['get', 'rpbench_large_str'], {return_buffers: true}]
tests.incr = [['incr', 'rpbench_counter']]
tests.lpush = [['lpush', "rpbench_list", '1234']]
tests.lrange10 = [['lrange', "rpbench_list", '0', '9'], {num_requests: 2e5}]
tests.lrange100 = [['lrange', "rpbench_list", '0', '99'], {num_requests: 5e4}]





// prepare data:
var socket = net.connect(6379)
send(socket, ['set', 'rpbench_small_str', '1234'])
send(socket, ['set', 'rpbench_large_str', new Array(4097).join("-")])
send(socket, ['set', 'rpbench_counter', '100'])
for (var i = 0; i < 100; i++)
send(socket, ['lpush', 'rpbench_list', (i * 1234).toString()])
send(socket, ['quit'])


socket.on('close', function() {
  runTests(Object.keys(tests))
})

var stringify = require('JSONStream').stringifyObject()
stringify.pipe(process.stdout, {end: false})

stringify.on('end', function () {
  // clear data:
  // prepare data:
  var socket = net.connect(6379)
  send(socket, ['del', 'rpbench_small_str', 'rpbench_large_str', 'rpbench_counter', 'rpbench_list'])
  send(socket, ['quit'])
})


