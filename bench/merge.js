#!env node
var fs = require('fs')
var argv = require('optimist')
  .boolean('pfx', {describe: 'Prefix current name'})
  .usage('$0 file1 [file2] [file3]')
  .demand(1)
  .argv

var files = argv._.map(function(file) {
  return JSON.parse(fs.readFileSync(file).toString())
})

var json = {}

files.forEach(function(input) {
  for (var key in input) {
    if (json.key) return
    json[key] = files.reduce(function(memo, file) {
      if (file[key]) {
        for (var i in file[key]) {
          memo[i] = file[key][i]
        }
      }
      return memo
    }, {})
  }
})

process.stdout.write(JSON.stringify(json))
process.stdout.write('\n')

