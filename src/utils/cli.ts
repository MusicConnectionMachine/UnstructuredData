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
            .option('-P, --Process', 'process queue items')
            .option('-A, --Add', 'add items to the queue')
            .option('-M, --Monitor', 'monitor queue size')
            .option('-d, --db-location [host]:[port]', 'database location, e.g. "127.0.0.1:5432"')
            .option('-a, --db-access [user]:[password]', 'database access, e.g. "USER:PASSWORD"')
            .option('-n, --db-name [name]', 'database name, e.g. "ProductionDB"')
            .option('-b, --blob-location [account]:[container]', 'blob storage location, e.g. "wetstorage:websites"')
            .option('-k, --blob-key [storageKey]', 'blob storage access key, e.g. "AZURE_KEY_HERE"')
            .option('-q, --queue-location [account]:[queue]', 'task queue location, e.g. "queueservice:taskqueue"')
            .option('-s, --queue-key [serviceKey]', 'queue service access key, e.g. "AZURE_KEY_HERE"')
            .option('-p, --processes [number]', 'number of worker threads, e.g. "4"')
            .option('-t, --heuristic-threshold [number]', 'filter strictness, the higher the stricter, e.g. "3"')
            .option('-l, --languages [languageCodes]', 'languages to filter for in ISO 639-1, e.g. "[\'de\', \'en\', \'fr\']"')
            .option('-e, --enable-pre-filter', 'enable bloom filter as pre filter')
            .option('-c, --crawl-version [version]', 'common crawl version, e.g. "CC-MAIN-2017-13"')
            .option('-r, --wet-range [from]:[to]', 'select a subset of WET files from CC, e.g. 0:420 (inclusive:exclusive)')
            .option('-f, --file-only-logging', 'disable console logging')
            .parse(process.argv);


        this.parseCmdOptions();

    }

    /**
     * Parse command line arguments and store values in CLI.parameters
     */
    private parseCmdOptions() {

        this.flags = {
            process: this.commander.Process,
            monitor: this.commander.Monitor,
            add: this.commander.Add
        };

        if (this.commander.dbLocation) {
            let split = this.commander.dbLocation.split(":", 2);
            if (split.length < 2) {
                console.warn("invalid --db-location [host]:[port]");
            } else {
                this.parameters["dbHost"] = split[0];
                this.parameters["dbPort"] = split[1];
            }
        }

        if (this.commander.dbAccess) {
            let split = this.commander.dbAccess.split(":", 2);
            if (split.length < 2) {
                console.warn("invalid --db-access [user]:[password]");
            } else {
                this.parameters["dbUser"] = split[0];
                this.parameters["dbPW"] = split[1];
            }
        }

        if (this.commander.dbName) {
            this.parameters["dbName"] = this.commander.dbName;
        }

        if (this.commander.blobLocation) {
            let split = this.commander.blobLocation.split(":", 2);
            if (split.length < 2) {
                console.warn("invalid --blob-location [account]:[container]");
            } else {
                this.parameters["blobAccount"] = split[0];
                this.parameters["blobContainer"] = split[1];
            }
        }

        if (this.commander.blobKey) {
            this.parameters["blobKey"] = this.commander.blobKey;
        }

        if (this.commander.queueLocation) {
            let split = this.commander.queueLocation.split(":", 2);
            if (split.length < 2) {
                console.warn("invalid --queue-location [account]:[queue]");
            } else {
                this.parameters["queueAccount"] = split[0];
                this.parameters["queueName"] = split[1];
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

        if (this.commander.crawlVersion) {
            this.parameters["crawlVersion"] = this.commander.crawlVersion;
        }

        if (this.commander.wetRange) {
            let split = this.commander.wetRange.split(":", 2);
            if (split.length < 2) {
                console.warn("invalid --wet-range [from]:[to]");
            } else {
                let wetFrom = parseInt(split[0]);
                if (wetFrom) this.parameters["wetFrom"] = wetFrom;
                let wetTo = parseInt(split[1]);
                if (wetTo) this.parameters["wetTo"] = wetTo;
            }
        }

        if (this.commander.fileOnlyLogging) {
            this.parameters["fileOnlyLogging"] = this.commander.fileOnlyLogging;
        }
    }
}