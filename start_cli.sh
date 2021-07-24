#!/bin/bash

read secret < ./deployment/client_secret
node ./dist/src/server.js 8000 $secret