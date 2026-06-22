# Runbook — ClickHouse system-log disk outage

> Reclaim disk when the Langfuse ClickHouse container fills the host and
> dependent services (e.g. Postgres) start crash-looping at 100% disk.

## Root cause

The disk hog is **ClickHouse's own internal system-log tables**, not Langfuse
application data:

- `system.trace_log` — query execution traces (diagnostic only)
- `system.text_log` — high-volume debug output
- plus `system.asynchronous_metric_log`, `system.metric_log`, `system.query_log`

These grow unbounded with no default TTL. On a busy instance they reach tens of
GB while the actual Langfuse app data is trivial (KB-scale).

## The gotcha that blocks a naive truncate

ClickHouse refuses `DROP`/`TRUNCATE` on any table larger than
`max_table_size_to_drop` (**default 50 GB**). A `trace_log` over 50 GB will
fail with *"Table size exceeds max_table_size_to_drop"*. The usual fix is the
flag file `touch /var/lib/clickhouse/flags/force_drop_table`, but that needs a
shell on the box — and during a full-disk outage `docker exec` is often wedged.

**Workaround:** pass the override as an HTTP query parameter. Settings sent on
the URL apply per-request, so no filesystem access is required.

## Procedure — run ON the prod host

`docker exec` is not needed; we hit the ClickHouse HTTP interface (port 8123)
directly. The container already has `CLICKHOUSE_USER` / `CLICKHOUSE_PASSWORD`.

```bash
# 1. Point at the ClickHouse HTTP interface. If 8123 isn't published on the host,
#    use the container IP, e.g.:
#    CH=http://$(docker inspect -f \
#      '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' <container>):8123
CH=${CH:-http://localhost:8123}
AUTH="--user ${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}"

# 2. (Optional) See what you'll reclaim, biggest first:
curl -s "$CH/" $AUTH --data-binary \
  "SELECT table, formatReadableSize(sum(bytes_on_disk)) sz
     FROM system.parts WHERE database='system'
     GROUP BY table ORDER BY sum(bytes_on_disk) DESC FORMAT PrettyCompact"

# 3. IMMEDIATE RELIEF — truncate diagnostic logs. The query-param override
#    bypasses the 50GB drop guard without the force_drop_table flag file.
OPTS="max_table_size_to_drop=0&max_partition_size_to_drop=0"
for t in trace_log text_log asynchronous_metric_log metric_log query_log; do
  echo "truncating system.$t ..."
  curl -s "$CH/?$OPTS" $AUTH --data-binary "TRUNCATE TABLE system.$t"
done
# Space frees within seconds-to-minutes -> dependent services recover.
# NOTE: the Postgres data volume is NOT touched by any of this.

# 4. DURABLE FIX — set retention so logs can't refill (Langfuse-recommended):
for s in "trace_log 3" "text_log 3" "asynchronous_metric_log 3" "query_log 7" "metric_log 7"; do
  set -- $s
  curl -s "$CH/" $AUTH --data-binary \
    "ALTER TABLE system.$1 MODIFY TTL event_time + INTERVAL $2 DAY"
done
```

## Key facts

- **Truncate reclaims space, not TTL.** `MODIFY TTL` only changes metadata and
  frees data on the next background merge — which can stall on a 100%-full
  disk. Step 3 (truncate) is the outage-breaker; step 4 is prevention.
- Truncating `*_log` tables is safe; ClickHouse recreates them automatically
  (~7s).
- For a fix that survives table recreation across restarts, also add `<ttl>`
  blocks under each `*_log` section in a ClickHouse `config.d/*.xml` override.
  That needs a restart, so it is a follow-up, not part of the firefight.

## Production validation (2026-06-15)

This procedure was exercised end-to-end during a real outage on the langfuse
ClickHouse container (`ikigaios-langfuse-clickhouse`):

- **Actual root cause of the bloat:** ClickHouse's sampling **query profiler**
  (`query_profiler_real_time_period_ns`, 1 sample/sec) running since container
  start with no TTL on `system.trace_log` — it accumulated ~3.2 billion rows
  (~64 GiB) over ~6 weeks and filled the host disk, which crash-looped a
  co-located Postgres.
- **Durable fix that stuck:** the runtime `MODIFY TTL` (3-day) is not enough on
  its own — pair it with `ttl_only_drop_parts = 1` (cheap whole-partition drops
  instead of row-rewrites), persist the TTL via a `config.d/*.xml` drop-in
  mounted through compose (survives container recreation), and **disable the
  profiler at source** (`query_profiler_real_time_period_ns = 0`) so the table
  stops growing in the first place.
- **The 50 GiB `max_table_size_to_drop` guard** did not trigger in practice
  because the table had already been truncated below the threshold by the time
  the authorized step ran — but keep the override/flag handy; a single 64 GiB
  `trace_log` will hit it.

## Sources

- Altinity KB — "System tables ate my disk"
- langfuse/langfuse-k8s#333 — default TTL retention for ClickHouse system tables
- ChistaDATA — Troubleshooting Disk Space in ClickHouse
- Pulse / OneUptime — `max_table_size_to_drop` and the `force_drop_table` flag
