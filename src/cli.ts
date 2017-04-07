#!/usr/bin/env node

const commander = require('commander');

commander
    //.arguments('<file1>')
    //.arguments('<file2>')
    .option('-s, --source [start]:[end]', 'the subset of WET files to process, e.g. "0:99"')
    .option('-l, --db-location [host]:[port]', 'database location, e.g. "127.0.0.1:5432"')
    .option('-a, --db-access [user]:[password]', 'database access, e.g. "musicmachine:PASSWORD"')
    .option('-b, --blob-location [account]:[container]', 'blob storage location, e.g. "wetstorage:websites"')
    .option('-k, --blob-key storageKey]', 'blob storage access key, e.g. "AZURE_KEY_HERE"')
    .option('-t, --threads [number]', 'number of worker threads, e.g. "4"')
    .option('-c, --crawl [version]', 'common crawl version, e.g. "CC-MAIN-2017-13"')
    .parse(process.argv);

if (commander.source) console.log("source: " + commander.source);
if (commander.dbLocation) console.log("database location: " + commander.dbLocation);
if (commander.dbAccess) console.log("database access: " + commander.dbAccess);
if (commander.blobLocation) console.log("blob location: " + commander.blobLocation);
if (commander.blobKey) console.log("blob access: " + commander.blobKey);
if (commander.threads) console.log("threads: " + commander.threads);
if (commander.crawl) console.log("crawl: " + commander.crawl);

// try to run this with
// node out/cli.js -s source-here -l db-loc -a db-access -b blob -k blob-key -t num-threads -c crawl