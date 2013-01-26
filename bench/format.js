var fs = require('fs')
var archy = require('archy')
var argv = require('optimist')
  .usage('$0 [file]')
  .argv


var json = JSON.parse(fs.readFileSync(argv._[0] || '/dev/stdin').toString())

var columns = []

for (var i in json) for (var key in json[i])
  if (-1 === columns.indexOf(key)) columns.push(key)

function lpad(str, padString, length) {
  while (str.length < length) str = padString + str
  return str
}
function rpad(str, padString, length) {
  while (str.length < length) str += padString
  return str
}

function printHead() {
  process.stdout.write(rpad('', ' ', 25))
  columns.forEach(function(column) {
    process.stdout.write(rpad(column, ' ', 16))
  })
  process.stdout.write('\n')
}

function profilerRow(node, indent) {
  var out = rpad(node.label, ' ', 50 - indent)
  out += lpad(node.perc_rel + '%', ' ', 10)
  out += lpad(node.perc_abs + '%', ' ', 10)
  out += lpad(node.samples.toString(), ' ', 10)
  out += lpad(node.totalTime, ' ', 10)
  out += lpad(node.selfTime, ' ', 10)
  return out
}

function formatProfile(node, parent, indent) {
  indent = indent ||0
  if (parent) {
    node.perc_rel = (node.totalTime / parent.totalTime) * 100
    node.perc_abs = node.perc_rel / 100 * parent.perc_abs
  }
  else {
    node.perc_abs = 100
    node.perc_rel = 100
  }
  node.perc_rel = node.perc_rel.toFixed(2)
  node.perc_abs = node.perc_abs.toFixed(2)
  node.totalTime = node.totalTime.toFixed(2)
  node.selfTime = node.selfTime.toFixed(2)
  node.label = profilerRow(node, indent)
  node.nodes = node.nodes.map(function(n) {
    return formatProfile(n, node, indent + (indent ? 2 : 4))
  })
  return node
}

printHead()


for (var i in json) {
  var result = json[i]
  process.stdout.write(rpad(i, ' ', 25))

  var min = columns.reduce(function(min, column) {
    if (result[column]) {
      if (result[column].time instanceof Array) {
        var input = result[column].time
        var avg = result[column].time.reduce(function(memo, time) {
          return memo + time
        }, 0) / input.length
        result[column].disp = Math.sqrt(result[column].time.reduce(function(memo, time) {
          return memo + Math.pow(time - avg, 2)
        }, 0) / input.length)
        result[column].time = avg
      }
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
      val = result[column].time.toFixed(0)
      if (result[column].disp) {
        val += '\x1B[33m±' + Math.round(result[column].disp) + '\x1B[39m'
        pad+=10
      }
      if (result[column].time > min) {
        val += ' \x1B[31m' + Math.round(result[column].time/min * 100 - 100) + '%\x1B[39m'
        pad+=10
      }
    }
    process.stdout.write(rpad(val, ' ', 16 + pad))

  })
  process.stdout.write('\n')

  columns.forEach(function(column) {
    if (result[column].profiler) {
      console.log(profilerRow({
        label: column,
        perc_rel: 'Relative ',
        perc_abs: 'Total ',
        samples: 'Samples',
        totalTime: 'Total',
        selfTime: 'Self'}, 0))
      console.log(archy(formatProfile(result[column].profiler)))
    }
  })
}