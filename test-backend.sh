#!/bin/bash
cd /home/coreqlx01/Documents/dev/ReactJS/consorciosWEb/backend
echo "=== TEST START ===" > /home/coreqlx01/Documents/dev/ReactJS/consorciosWEb/backend-test.log
node --version >> /home/coreqlx01/Documents/dev/ReactJS/consorciosWEb/backend-test.log 2>&1
echo "=== Loading deps ===" >> /home/coreqlx01/Documents/dev/ReactJS/consorciosWEb/backend-test.log
node -e "const e=require('express'); console.log('express ok,v'+e.version); const pg=require('pg'); console.log('pg ok'); const d=require('dotenv'); console.log('dotenv ok');" >> /home/coreqlx01/Documents/dev/ReactJS/consorciosWEb/backend-test.log 2>&1
echo "=== Starting server ===" >> /home/coreqlx01/Documents/dev/ReactJS/consorciosWEb/backend-test.log
timeout 10 node src/index.js >> /home/coreqlx01/Documents/dev/ReactJS/consorciosWEb/backend-test.log 2>&1
echo "=== EXIT CODE: $? ===" >> /home/coreqlx01/Documents/dev/ReactJS/consorciosWEb/backend-test.log
