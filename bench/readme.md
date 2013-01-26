## Profiling tools for redisparse

Some command line utilities for analyzing benchmark data. Maybe sometime I'll move them to separate repo.


### Single run

```
node bench
node bench --parser node_redis
```

Available parsers include redisparse, node_redis, node_redis_old and hiredis. Defaults to redisparse.

### Include profiler data in benchmarks:

```
node bench --profiler
```

### Merge many JSON results.

```
node bench/merge file_1 [file_2] ... [file_n]
```

Without temporary files:

```
node bench/merge <({node bench; node bench --parser node_redis})
```

DO NOT DO THIS! It will make tests to run in parallel, causing useless results.

```
  #This example is wrong
  node bench/merge <(node bench) <(node bench --parser node_redis)
```

Use [manytimes](http://stackoverflow.com/questions/3737740/is-there-a-better-way-to-run-a-command-n-times-in-bash) to add precision.

```
node bench/merge <(manytimes 5 node bench)
```

### Pretty print

Pipe the JSON output through `node bench/format`.


### Complete example

Run all tests 5 times for every parser and format output.

```
node bench/merge <({manytimes 5 node bench; manytimes 5 node bench --parser node_redis; manytimes 5 node bench --parser node_redis_old; manytimes 5 node bench --parser hiredis}) | node bench/format
```

