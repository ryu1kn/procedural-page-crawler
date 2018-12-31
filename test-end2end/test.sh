#!/bin/bash

set -u

cd "$(dirname "$0")"

test_results=()
http_server_container=crawler-target-server

function necho() {
    echo -e "\n---> "$@
}

function runTestDriver() {
    local test_index=$1
    local template_dir=$2
    local test_dir=$3

    rm -rf $test_dir
    cp -r $template_dir $test_dir

    cd $test_dir

    npm pack ../..
    npm install
    npm install ./procedural-page-crawler-*.tgz

    necho "Running tests"
    npm test
    test_results[$test_index]=$?
}

necho "Starting crawling target http server..."
docker run --name $http_server_container --rm -d \
    -p 8080:8080 -v `pwd`:/app -w /app \
    node:10-alpine node crawl-target-server.js

(runTestDriver 0 case-commandline-template __case-commandline-instance)
(runTestDriver 1 case-library-template __case-library-instance)

necho "Removing the http server"
docker stop $http_server_container

exit $((test_results[0] + test_results[1]))
