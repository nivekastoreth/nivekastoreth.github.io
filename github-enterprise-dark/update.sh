#!/bin/bash

version="4.2.286"
curl -Ls "https://github.com/StylishThemes/GitHub-Dark/blob/v${version}/github-dark.user.css?raw=true" \
  | sed -re '/@-moz-document/{s|github(\\\\)?.com|github\1.rp-core\1.com|g}' \
         -e 's|^(@name *) .*$|\1 GitHub Dark (Enterprise)|g' \
         -e 's|^(@namespace *) .*$|\1 StylishThemes (Custom)|g' \
         -e 's|^(@updateURL *) .*$|\1 https://nivekastoreth.github.io/github-enterprise-dark/github-dark.user.css|g' \
  > github-dark.user.css
