var net = require('net')
var Parser = require('../').Parser
var argv = require('optimist').argv

function command(args) {
  return args.reduce(function (memo, val) {
    return memo += '$' + Buffer.byteLength(val) + '\r\n' + val + '\r\n'
  }, '*' + args.length + '\r\n')
}

function run(args) {
  console.log('>> Request:')
  console.log(command(args))
  socket.write(command(args))
}

function listenStdin() {
  process.stdin.resume()
  process.stdin.on('data', function(data) {
    var s = data.toString()
    s = s.substr(0, s.length - 1)
    if (s.length) run(s.split(' '))
  })
}

// Split data into chucks.
function slice(buffer, size, f) {
  for (var i = 0; i < buffer.length; i += size) {
    f(buffer.slice(i, Math.min(buffer.length, i + size)))
  }
}


var socket = net.connect(6379)
var parser = new Parser

socket.on('connect', function() {
  run(['PING'])
  run(['SET', 'foo', 'barbar'])
  run(['STRLEN', 'foo'])
  run(['nosuchcommand'])
  run(['get', 'foo'])
  run(['keys', '*'])
  listenStdin()
})

socket.on('data', function(data) {
  function process(data) {
    console.log('>> Data:')
    console.log(data.toString())
    parser.execute(data)
  }
  if (+argv.slice) {
    slice(data, +argv.slice, function (d) { process(d) })
  }
  else {
    process(data)
  }
})

parser.on('reply', function (d) {
  console.log('>> Parser Reply')
  console.log(typeof d, d ? d.toString() : d)
})
parser.on('reply partial', function (d) {
  console.log('>> Parser Reply Partial')
  console.log(typeof d, d.toString())
})
parser.on('reply error', function (d) {
  console.log('>> Parser Reply Error')
  console.log(d.toString())
})
parser.on('error', function (e) {
  console.log('>> Parser Error')
  console.log(e)
})


