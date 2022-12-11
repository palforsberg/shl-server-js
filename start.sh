#!/bin/bash

./stop.sh

pm2 start ecosystem.config.js

echo "Started"