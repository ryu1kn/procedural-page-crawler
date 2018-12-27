#!/bin/bash

set -u

cd "$(dirname "$0")"

test_dir=__driver-project-instance
http_server_container=crawler-target-server

function necho() {
    echo -e "\n---> "$@
}

rm -rf $test_dir
cp -r driver-project-template $test_dir

necho "Starting crawling target http server..."
docker run --name $http_server_container --rm -d \
    -p 8080:8080 -v `pwd`:/app -w /app \
    node:10-alpine node crawl-target-server.js

necho "Running tests"
cd $test_dir

npm pack ../..
npm install
npm install ./page-crawler-*.tgz

./test.sh
test_result=$?

necho "Removing the http server"
docker stop $http_server_container

exit $test_result
