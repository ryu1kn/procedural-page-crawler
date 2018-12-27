#!/bin/bash

set -euo pipefail

result_file=output.json

node_modules/.bin/crawl --instructions ./instructions.js --output $result_file

if [[ $(cat $result_file) != '"About | Google"' ]]; then
    exit 1
fi
