#!/bin/bash

set -euo pipefail

result_file=output.json
expected='"About | Page Crawler"'

node_modules/.bin/crawl --instructions ./instructions.js --output $result_file

actual=$(cat $result_file)

if [[ $actual == $expected ]]; then
    echo "Test passed"
else
    echo "Expected \"$expected\", but got \"$actual\""
    exit 1
fi
