#!/bin/bash

read pid < ./deployment/server.pid
echo "Kill $pid"
kill "$pid"