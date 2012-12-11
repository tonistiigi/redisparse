## Work in progress!

### Goals:

- 100% streaming Redis response parser.
- No data buffering. Every chunk is processed separately/at once.
- API compatibility with node_redis and hiredis(where possible).
- Much faster for big data.
- Comparable speed with node_redis for small data.
