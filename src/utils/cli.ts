export class CLI {

    private static instance : CLI;

    public static getInstance() : CLI {
        if (!CLI.instance) {
            CLI.instance = new CLI();
        }
        return CLI.instance
    }

    private commander = require('commander');

    public flags = {};
    public parameters = {};

    /**
     * Init the commander module, parse env variables, config file and command line args.
     */
    private constructor() {

        // init commander
        this.commander
            .option('-d, --db-location [host]:[port]', 'database location, e.g. "127.0.0.1:5432"')
            .option('-a, --db-access [user]:[password]', 'database access, e.g. "USER:PASSWORD"')
            .option('-n, --db-name [name]', 'database name, e.g. "ProductionDB"')
            .option('-b, --blob-location [account]:[container]', 'blob storage location, e.g. "wetstorage:websites"')
            .option('-k, --blob-key [storageKey]', 'blob storage access key, e.g. "AZURE_KEY_HERE"')
            .option('-p, --processes [number]', 'number of worker threads, e.g. "4"')
            .option('-t, --heuristic-threshold [number]', 'filter strictness, the higher the stricter, e.g. "3"')
            .option('-l, --languages [languageCodes]', 'languages to filter for in ISO 639-1, e.g. "[\'de\', \'en\', \'fr\']"')
            .option('-e, --enable-pre-filter', 'enable bloom filter as pre filter')
            .option('-q, --queue-location [account]:[queue]', 'task queue location, e.g. "queueservice:taskqueue"')
            .option('-s, --queue-key [serviceKey]', 'queue service access key, e.g. "AZURE_KEY_HERE"')
            .parse(process.argv);


        this.parseCmdOptions();

    }

    /**
     * Parse command line arguments and store values in CLI.parameters
     */
    private parseCmdOptions() {

        if (this.commander.dbLocation) {
            if (!this.commander.dbLocation.split) {
                console.warn("invalid --db-location [host]:[port]");
            } else {
                let splitted = this.commander.dbLocation.split(":", 2);
                this.parameters["dbHost"] = splitted[0];
                let dbPort = parseInt(splitted[1]);
                if (dbPort) this.parameters["dbPort"] = dbPort;
            }
        }

        if (this.commander.dbAccess) {
            if (!this.commander.dbAccess.split) {
                console.warn("invalid --db-access [user]:[password]");
            } else {
                let splitted = this.commander.dbAccess.split(":", 2);
                this.parameters["dbUser"] = splitted[0];
                this.parameters["dbPW"] = splitted[1];
            }
        }

        if (this.commander.dbName) {
            this.parameters["dbName"] = this.commander.dbName;
        }

        if (this.commander.blobLocation) {
            if (!this.commander.blobLocation.split) {
                console.warn("invalid --blob-location [account]:[container]");
            } else {
                let splitted = this.commander.blobLocation.split(":", 2);
                this.parameters["blobAccount"] = splitted[0];
                this.parameters["blobContainer"] = splitted[1];
            }
        }

        if (this.commander.blobKey) {
            this.parameters["blobKey"] = this.commander.blobKey;
        }

        if (this.commander.queueLocation) {
            if (!this.commander.queueLocation.split) {
                console.warn("invalid --queue-location [account]:[queue]");
            } else {
                let splitted = this.commander.queueLocation.split(":", 2);
                this.parameters["queueAccount"] = splitted[0];
                this.parameters["queueName"] = splitted[1];
            }
        }

        if (this.commander.queueKey) {
            this.parameters["queueKey"] = this.commander.queueKey;
        }

        if (this.commander.processes) {
            let processes = parseInt(this.commander.processes);
            if (processes) this.parameters["processes"] = processes;
        }

        if (this.commander.heuristicThreshold) {
            let threshold = parseInt(this.commander.heuristicThreshold);
            if (threshold) this.parameters["heuristicThreshold"] = threshold;
        }

        if (this.commander.languages) {
            let languageCodes = JSON.parse(this.commander.languages);
            if (languageCodes) this.parameters["languageCodes"] = languageCodes;
        }

        if (this.commander.enablePreFilter) {
            this.parameters["enablePreFilter"] = this.commander.enablePreFilter;
        }
    }
}
