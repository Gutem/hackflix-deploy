#!/bin/bash
# Hackflix API Benchmark Suite
# Usage: bash benchmarks/run.sh

API="http://localhost:3001"
echo "=== Hackflix Benchmark Suite ==="

if ! curl -s "$API/health" > /dev/null 2>&1; then
  echo "ERROR: Backend not running at $API. Start: bun run dev"
  exit 1
fi

DEMO_TOKEN=$(curl -s -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"demo"}' | jq -r '.token')
FIRST_ID=$(curl -s "$API/api/playlist" -H "Authorization: Bearer $DEMO_TOKEN" | jq -r '.items[0].id')

echo ""
echo "=== Cold-start latency (single request) ==="
for ep in "/health" "/api/playlist" "/api/conferences" "/api/search?q=security" "/api/content/$FIRST_ID"; do
  time=$(curl -s -o /dev/null -w "%{time_total}" "$API$ep" -H "Authorization: Bearer $DEMO_TOKEN")
  size=$(curl -s -o /dev/null -w "%{size_download}" "$API$ep" -H "Authorization: Bearer $DEMO_TOKEN")
  printf "  %-35s %6dms  %6s bytes\n" "$ep" "$(echo "$time * 1000" | bc)" "$size"
done

echo ""
echo "=== Warm latency (5 requests avg) ==="
for ep in "/api/playlist" "/api/conferences" "/api/search?q=security"; do
  total=0; for i in 1 2 3 4 5; do 
    t=$(curl -s -o /dev/null -w "%{time_total}" "$API$ep" -H "Authorization: Bearer $DEMO_TOKEN")
    total=$(echo "$total + $t" | bc)
  done
  avg=$(echo "scale=0; $total * 1000 / 5" | bc)
  printf "  %-35s %6dms avg\n" "$ep" "$avg"
done

echo ""
echo "=== Load test: autocannon (10s, 50 connections) ==="
for ep in "/api/playlist" "/api/conferences" "/api/search?q=security"; do
  printf "\n  --- %s ---\n" "$ep"
  npx autocannon -d 10 -c 50 -H "Authorization: Bearer $DEMO_TOKEN" "$API$ep" 2>/dev/null | \
    grep -E "Req/sec|Latency|requests|errors|throughput"
done

echo ""
echo "=== Unauthenticated gateway test ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/playlist")
echo "  /api/playlist (no auth) → $STATUS (expect 401)"

echo ""
echo "=== Subtitle premium gate test ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/subtitles?url=https://example.com" -H "Authorization: Bearer $DEMO_TOKEN")
echo "  /api/subtitles (demo/basic) → $STATUS (expect 403)"

echo ""
echo "=== Compression test ==="
RAW=$(curl -s -o /dev/null -w "%{size_download}" "$API/api/conferences" -H "Authorization: Bearer $DEMO_TOKEN")
GZ=$(curl -s -o /dev/null -w "%{size_download}" "$API/api/conferences" -H "Authorization: Bearer $DEMO_TOKEN" -H "Accept-Encoding: gzip")
echo "  /api/conferences  raw: ${RAW} bytes  gzip: ${GZ} bytes  saved: $(echo "scale=0; (1 - $GZ/$RAW) * 100" | bc)%"

echo ""
echo "=== Benchmark Complete ==="
