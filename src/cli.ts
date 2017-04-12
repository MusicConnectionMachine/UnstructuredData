export class CLI {

    private static instance : CLI;

    public static getInstance() : CLI {
        if (!CLI.instance) {
            CLI.instance = new CLI();
        }
        return CLI.instance
    }

    private commander = require('commander');

    public parameters = {
        wetFrom: undefined,
        wetTo: undefined,
        dbHost: undefined,
        dbPort: undefined,
        dbUser: undefined,
        dbPW: undefined,
        blobAccount: undefined,
        blobContainer: undefined,
        blobKey: undefined,
        processes: undefined,
        crawlVersion: undefined
    };

    /**
     * Init the commander module, parse env variables, config file and command line args.
     */
    private constructor() {

        // init commander
        this.commander
            .option('-w, --wet-range [start]:[end]', 'the subset of WET files to process, e.g. "0:99"')
            .option('-d, --db-location [host]:[port]', 'database location, e.g. "127.0.0.1:5432"')
            .option('-a, --db-access [user]:[password]', 'database access, e.g. "USER:PASSWORD"')
            .option('-b, --blob-location [account]:[container]', 'blob storage location, e.g. "wetstorage:websites"')
            .option('-k, --blob-key [storageKey]', 'blob storage access key, e.g. "AZURE_KEY_HERE"')
            .option('-t, --threads [number]', 'number of worker threads, e.g. "4"')
            .option('-c, --crawl [version]', 'common crawl version, e.g. "CC-MAIN-2017-13"')
            .parse(process.argv);


        this.parseCmdOptions();

    }

    /**
     * Parse command line arguments and store values in CLI.parameters
     */
    private parseCmdOptions() {

        if (this.commander.wetRange) {
            if (!this.commander.wetRange.split) {
                console.warn("invalid --wet-range [start]:[end]");
            } else {
                let splitted = this.commander.wetRange.split(":", 2);
                let wetFrom = parseInt(splitted[0]);
                let wetTo = parseInt(splitted[1]);
                if (wetFrom) this.parameters.wetFrom = wetFrom;
                if (wetTo)   this.parameters.wetTo = wetTo;
            }
        }

        if (this.commander.dbLocation) {
            if (!this.commander.dbLocation.split) {
                console.warn("invalid --db-location [host]:[port]");
            } else {
                let splitted = this.commander.dbLocation.split(":", 2);
                this.parameters.dbHost = splitted[0];
                let dbPort = parseInt(splitted[1]);
                if (dbPort) this.parameters.dbPort = dbPort;
            }
        }

        if (this.commander.dbAccess) {
            if (!this.commander.dbAccess.split) {
                console.warn("invalid --db-access [user]:[password]");
            } else {
                let splitted = this.commander.dbAccess.split(":", 2);
                this.parameters.dbUser = splitted[0];
                this.parameters.dbPW = splitted[1];
            }
        }

        if (this.commander.blobLocation) {
            if (!this.commander.blobLocation.split) {
                console.warn("invalid --blob-location [account]:[container]");
            } else {
                let splitted = this.commander.blobLocation.split(":", 2);
                this.parameters.blobAccount = splitted[0];
                this.parameters.blobContainer = splitted[1];
            }
        }

        if (this.commander.blobKey) {
            this.parameters.blobKey = this.commander.blobKey;
        }

        if (this.commander.processes) {
            let threads = parseInt(this.commander.processes);
            if (threads) this.parameters.processes = threads;
        }

        if (this.commander.crawl) {
            this.parameters.crawlVersion = this.commander.crawl;
        }
    }
}
