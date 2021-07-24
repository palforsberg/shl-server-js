#!/bin/bash

./stop.sh

read secret < ./deployment/client_secret
node ./dist/src/server.js 8080 $secret > deployment/console.log 2>&1 &

echo "Started $!"
echo $! > deployment/server.pid