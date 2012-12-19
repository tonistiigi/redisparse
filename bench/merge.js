var fs = require('fs')
var JSONStream = require('JSONStream')
var argv = require('optimist')
  .usage('$0 file1 [file2] [file3]')
  .demand(1)
  .argv

var files = []
function load() {
  if (!argv._.length) return run()
  var file = argv._.shift()
  var parse = fs.createReadStream(file).pipe(JSONStream.parse())
  parse.on('data', files.push.bind(files))
  parse.on('end', load)
}

load()

function run() {
  var json = {}

  files.forEach(function(input) {
    for (var test in input) {
      if (json[test]) return
      json[test] = files.reduce(function(memo, file) {
        if (file[test]) {
          for (var i in file[test]) {
            if (memo[i]) {
              if (!(memo[i].time instanceof Array)) {
                memo[i].time = [memo[i].time]
              }
              memo[i].time.push(file[test][i].time)
            }
            else {
              memo[i] = file[test][i]
            }
          }
        }
        return memo
      }, {})
    }
  })

  process.stdout.write(JSON.stringify(json))
  process.stdout.write('\n')

}

