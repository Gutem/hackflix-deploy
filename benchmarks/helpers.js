/**
 * Artillery processor helpers.
 * Pre-fetches a demo token and exposes it as an environment variable.
 * 
 * Usage:
 *   export DEMO_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
 *     -H 'Content-Type: application/json' \
 *     -d '{"username":"demo","password":"demo"}' | jq -r '.token')
 *   npx artillery run benchmarks/api-benchmark.yml
 */

module.exports = {};
