#!/bin/bash
# Starts a local validator with the program and Metaplex Core preloaded, runs the suite, stops it.
# (Equivalent to `anchor test`; kept as a fallback for environments where anchor's port check misfires.)
set -u
cd "$(dirname "$0")"
PID=$(solana-keygen pubkey target/deploy/fundra-keypair.json)
pkill -f solana-test-validator; sleep 1; rm -rf /tmp/test-ledger
solana-test-validator --reset --ledger /tmp/test-ledger \
  --bpf-program "$PID" target/deploy/fundra.so \
  --bpf-program CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d tests/fixtures/mpl_core_program.so \
  > /tmp/validator.log 2>&1 &
VPID=$!
for i in $(seq 1 60); do
  sleep 2
  curl -s -m 2 -X POST -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' http://127.0.0.1:8899 | grep -q ok && break
done
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=$HOME/.config/solana/id.json
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/fundra.ts
echo "MOCHA_EXIT=$?"
kill $VPID
