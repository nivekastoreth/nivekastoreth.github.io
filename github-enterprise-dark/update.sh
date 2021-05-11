#!/bin/bash

version="4.2.286"
curl -Ls "https://github.com/StylishThemes/GitHub-Dark/blob/v${version}/github-dark.user.css?raw=true" \
  | sed -re '/@-moz-document/{s|github(\\\\)?.com|github\1.rp-core\1.com|g}' \
  > github-dark.user.css
