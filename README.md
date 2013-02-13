[![Build Status](https://secure.travis-ci.org/tonistiigi/redisparse.png)](http://travis-ci.org/tonistiigi/redisparse)

## redisparse

Streaming Redis response parser.

Does not do any data buffering or bail out on incomplete input data. Every chunk is processed separately.

API is mostly compatible with [mranney/node_redis](https://github.com/mranney/node_redis) with added support for partial replies.

## Installation

```
npm install redisparse
```

## Usage

```
var Parser = require('redisparse').Parser
var parser = new Parser
parser.execute(data)
```

### new Parser([options])

`options.return_buffers` - Return buffers for replies.

### execute(buffer)

Input binary redis response data to the parser.

### Events

`reply` - Result for a command. Type depends on command. Can be string, buffer, integer, array or null.

`reply partial` - Same as reply but more replies are coming.

`reply error` - Redis command error.

`error` - Parsing error. Invalid data.

