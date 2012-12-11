var net = require('net')

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

var socket = net.connect(6379)

socket.on('connect', function() {
  run(['PING'])
  run(['SET', 'foo', 'barbar'])
})

socket.on('data', function(data) {
  console.log('>> Data:')
  console.log(data.toString())
})


