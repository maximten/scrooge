#!/bin/bash
git pull
./build.prod.sh
docker-compose -f docker-compose.prod.yml up -d
docker image prune -f