#!env node
var fs = require('fs')
var argv = require('optimist')
  .boolean('pfx', {describe: 'Prefix current name'})
  .usage('$0 newname [file]')
  .demand(1)
  .argv

var json = fs.readFileSync(argv._[1] || '/dev/stdin').toString()

json = JSON.parse(json)

for (var i in json) {
  var keys = Object.keys(json[i])
  if (keys.length != 1) {
    throw(new Error('Object needs to contain only single key to rename'))
  }
  var key = keys[0]
  json[i][argv._[0] + (argv.pfx ? key : '')] = json[i][key]
  delete json[i][key]
}

process.stdout.write(JSON.stringify(json))