var fs = require('fs')
var argv = require('optimist')
  .usage('$0 [file]')
  .argv

var json = JSON.parse(fs.readFileSync(argv._[0] || '/dev/stdin').toString())

var columns = []

for (var i in json) for (var key in json[i])
  if (-1 === columns.indexOf(key)) columns.push(key)


function rpad(str, padString, length) {
  while (str.length < length) str += padString
  return str
}

function printHead() {
  process.stdout.write(rpad('', ' ', 25))
  columns.forEach(function(column) {
    process.stdout.write(rpad(column, ' ', 14))
  })
  process.stdout.write('\n')
}

printHead()

for (var i in json) {
  var result = json[i]
  process.stdout.write(rpad(i, ' ', 25))

  var min = columns.reduce(function(min, column) {
    if (result[column]) {
      if (min === undefined || result[column].time < min) {
        min = result[column].time
      }
    }
    return min
  }, undefined)

  columns.forEach(function(column) {
    var val = ''
    var pad = 0
    if (result[column]) {
      val = result[column].time.toString()
      if (+val > min) {
        val += ' \x1B[31m' + Math.round(val/min * 100 - 100) + '%\x1B[39m'
        pad+=10
      }
    }
    process.stdout.write(rpad(val, ' ', 14 + pad))
  })
  process.stdout.write('\n')
}