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

function listenStdin() {
  process.stdin.resume()
  process.stdin.on('data', function(data) {
    var s = data.toString()
    s = s.substr(0, s.length - 1)
    if (s.length) run(s.split(' '))
  })
}

var socket = net.connect(6379)

socket.on('connect', function() {
  run(['PING'])
  run(['SET', 'foo', 'barbar'])

  listenStdin()
})

socket.on('data', function(data) {
  console.log('>> Data:')
  console.log(data.toString())
})


