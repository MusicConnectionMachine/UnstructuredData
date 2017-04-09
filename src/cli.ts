export class CLI {

    private static commander = require('commander');

    // runtime parameters, default values
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

    // these parameters will not be logged
    private static privateParms = new Set([
        "dbPW", "blobKey"
    ]);

    /**
     * Init the commander module, parse env variables, config file and command line args.
     */
    public static initCLI() {

        // init commander
        CLI.commander
            .option('-w, --wet-range [start]:[end]', 'the subset of WET files to process, e.g. "0:99"')
            .option('-d, --db-location [host]:[port]', 'database location, e.g. "127.0.0.1:5432"')
            .option('-a, --db-access [user]:[password]', 'database access, e.g. "USER:PASSWORD"')
            .option('-b, --blob-location [account]:[container]', 'blob storage location, e.g. "wetstorage:websites"')
            .option('-k, --blob-key [storageKey]', 'blob storage access key, e.g. "AZURE_KEY_HERE"')
            .option('-t, --threads [number]', 'number of worker threads, e.g. "4"')
            .option('-c, --crawl [version]', 'common crawl version, e.g. "CC-MAIN-2017-13"')
            .parse(process.argv);


        // environment variables override default hardcoded values
        CLI.parseEnvVars();
        // config overrides environment vars
        CLI.parseConfigFile();
        // command line overrides all
        CLI.parseCmdOptions();

    }

    /**
     * Load parameters from environment variables.
     */
    public static parseEnvVars() {
        // TODO: replace default values in CLI.parameters with environment variables
    }

    /**
     * Load parameters from "config.json".
     */
    public static parseConfigFile() {
        let configFile = require('../config.json');
        for (let parm in CLI.parameters) {
            if (configFile[parm]) CLI.parameters[parm] = configFile[parm];
        }
    }

    /**
     * Parse command line arguments and store values in CLI.parameters
     */
    public static parseCmdOptions() {

        if (CLI.commander.wetRange) {
            if (!CLI.commander.wetRange.split) {
                console.warn("invalid --wet-range [start]:[end]");
            } else {
                let splitted = CLI.commander.wetRange.split(":", 2);
                let wetFrom = parseInt(splitted[0]);
                let wetTo = parseInt(splitted[1]);
                if (wetFrom) CLI.parameters.wetFrom = wetFrom;
                if (wetTo)   CLI.parameters.wetTo = wetTo;
            }
        }

        if (CLI.commander.dbLocation) {
            if (!CLI.commander.dbLocation.split) {
                console.warn("invalid --db-location [host]:[port]");
            } else {
                let splitted = CLI.commander.dbLocation.split(":", 2);
                CLI.parameters.dbHost = splitted[0];
                let dbPort = parseInt(splitted[1]);
                if (dbPort) CLI.parameters.dbPort = dbPort;
            }
        }

        if (CLI.commander.dbAccess) {
            if (!CLI.commander.dbAccess.split) {
                console.warn("invalid --db-access [user]:[password]");
            } else {
                let splitted = CLI.commander.dbAccess.split(":", 2);
                CLI.parameters.dbUser = splitted[0];
                CLI.parameters.dbPW = splitted[1];
            }
        }

        if (CLI.commander.blobLocation) {
            if (!CLI.commander.blobLocation.split) {
                console.warn("invalid --blob-location [account]:[container]");
            } else {
                let splitted = CLI.commander.blobLocation.split(":", 2);
                CLI.parameters.blobAccount = splitted[0];
                CLI.parameters.blobContainer = splitted[1];
            }
        }

        if (CLI.commander.blobKey) {
            CLI.parameters.blobKey = CLI.commander.blobKey;
        }

        if (CLI.commander.threads) {
            let threads = parseInt(CLI.commander.threads);
            if (threads) CLI.parameters.threads = threads;
        }

        if (CLI.commander.crawl) {
            CLI.parameters.crawlVersion = CLI.commander.crawl;
        }

    }

    /**
     * Log CLI.parameters, sensitive parameters will be hidden.
     */
    public static logParms() {
        console.log("Runtime parameters:");
        for (let parm in CLI.parameters) {
            if (!CLI.privateParms.has(parm)) {
                console.log("\t" + parm + " = " + CLI.parameters[parm]);
            } else {
                console.log("\t" + parm + " = [HIDDEN]");
            }
        }
    }

}
