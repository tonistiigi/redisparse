var profiler = require('v8-profiler')
var archy = require('archy')

exports.start = function() {
  profiler.startProfiling()
}

exports.end = function() {
  return getNode(profiler.stopProfiling().topRoot)
}
/*
function format(profile) {
  return archy(getNode(profile.topRoot))
}*/

function getNode(root, indent) {
  indent = indent || 0
  var len = 50
  /*
  var name = rpad(root.functionName, ' ', len - indent)
  if (name.length > len - indent) name = name.substr(0, len - indent)

  name += lpad(root.totalSamplesCount.toString(), ' ', 10)
  name += lpad(root.totalTime.toString(), ' ', 10)
  name += lpad(root.selfTime.toString(), ' ', 10)
  */
  var node = {label: root.functionName, samples: root.totalSamplesCount,
    totalTime: root.totalTime, selfTime: root.selfTime, nodes: []}
  for (var i=0; i<root.childrenCount; i++) {
    node.nodes.push(getNode(root.getChild(i), indent + (indent ? 2 : 4)))
  }
  return node
}

function lpad(str, padString, length) {
  while (str.length < length) str = padString + str
  return str
}
function rpad(str, padString, length) {
  while (str.length < length) str += padString
  return str
}