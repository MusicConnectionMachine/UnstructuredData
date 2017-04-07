#!/usr/bin/env node

// try to run this with
// node out/cli.js -w 0:99 -d localhost:1234 -a db:pwd -b acc:container -k blob-key -t 1 -c crawl
// node out/cli.js -h

const commander = require('commander');
commander
    //.arguments('<file1>')
    //.arguments('<file2>')
    .option('-w, --wetRange [start]:[end]', 'the subset of WET files to process, e.g. "0:99"')
    .option('-d, --db-location [host]:[port]', 'database location, e.g. "127.0.0.1:5432"')
    .option('-a, --db-access [user]:[password]', 'database access, e.g. "USER:PASSWORD"')
    .option('-b, --blob-location [account]:[container]', 'blob storage location, e.g. "wetstorage:websites"')
    .option('-k, --blob-key [storageKey]', 'blob storage access key, e.g. "AZURE_KEY_HERE"')
    .option('-t, --threads [number]', 'number of worker threads, e.g. "4"')
    .option('-c, --crawl [version]', 'common crawl version, e.g. "CC-MAIN-2017-13"')
    .parse(process.argv);

export class CLI {


    public static parameters = {
        wetFrom: 0,
        wetTo: 999999,
        dbHost: "13.74.11.216",
        dbPort: 5432,
        dbUser: "privateStuff",
        dbPW: "privateStuff",
        blobAccount: "wetstorage",
        blobContainer: "websites",
        blobKey: "privateStuff",
        threads: 4,
        crawlVersion: "CC-MAIN-2017-13"
    };

    public static parseEnvVars() {
        // TODO: replace default values in CLI.parameters with environment variables
    }

    public static parseConfigFile() {
        // TODO: replace default values in CLI.parameters with values from config.json
    }

    public static parseCmdOptions() {
        if (commander.wetRange) {
            // [start]:[end]
            let splitted = commander.wetRange.split(":", 2);
            let wetFrom = parseInt(splitted[0]);
            let wetTo = parseInt(splitted[1]);
            if (wetFrom) CLI.parameters.wetFrom = wetFrom;
            if (wetTo)   CLI.parameters.wetTo = wetTo;
        }
        if (commander.dbLocation) {
            // [host]:[port]
            let splitted = commander.dbLocation.split(":", 2);
            CLI.parameters.dbHost = splitted[0];
            let dbPort = parseInt(splitted[1]);
            if (dbPort) CLI.parameters.dbPort = dbPort;
        }
        if (commander.dbAccess) {
            //[user]:[password]
            let splitted = commander.dbAccess.split(":", 2);
            CLI.parameters.dbUser = splitted[0];
            CLI.parameters.dbPW = splitted[1];
        }
        if (commander.blobLocation) {
            //[account]:[container]
            let splitted = commander.blobLocation.split(":", 2);
            CLI.parameters.blobAccount = splitted[0];
            CLI.parameters.blobContainer = splitted[1];
        }
        if (commander.blobKey) {
            CLI.parameters.blobKey = commander.blobKey;
        }
        if (commander.threads) {
            let threads = parseInt(commander.threads);
            if (threads) CLI.parameters.threads = threads;
        }
        if (commander.crawl) {
            CLI.parameters.crawlVersion = commander.crawl;
        }

    }

}

// environment variables override default hardcoded values
CLI.parseEnvVars();
// config overrides environment vars
CLI.parseConfigFile();
// command line overrides all
CLI.parseCmdOptions();


console.log("Starting with parms:\n", CLI.parameters);

// TODO: start ProcessingManager & Workers

