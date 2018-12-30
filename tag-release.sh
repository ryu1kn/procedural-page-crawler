#!/usr/bin/env bash

set -euo pipefail

release_ver=$(node -p 'JSON.parse(require("fs").readFileSync("./package.json", "utf8")).version')

git_tag_name=v$release_ver
git tag -a $git_tag_name -m $git_tag_name
git push origin $git_tag_name
