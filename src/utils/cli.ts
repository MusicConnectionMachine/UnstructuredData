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
            .option('--Delete-queue', 'delete queue')
            .option('-d, --db-location [host]:[port]', 'database location, e.g. "127.0.0.1:5432"')
            .option('-a, --db-access [user]:[password]', 'database access, e.g. "USER:PASSWORD"')
            .option('-n, --db-name [name]', 'database name, e.g. "ProductionDB"')
            .option('-b, --blob-access [account]:[accessKey]', 'blob storage credentials, e.g. "wetstorage:AZURE_KEY_HERE"')
            .option('-c, --blob-container [containerName]', 'blob storage container name, e.g. "websites"')
            .option('-q, --queue-access [account]:[accessKey]', 'task queue credentials, e.g. "queueservice:AZURE_KEY_HERE"')
            .option('-s, --queue-name [queueName]', 'task queue name, e.g. "taskqueue"')
            .option('--processes [number]', 'number of worker threads, e.g. "4"')
            .option('-t, --heuristic-threshold [number]', 'filter strictness, the higher the stricter, e.g. "3"')
            .option('--languages [languageCodes]', 'languages to filter for in ISO 639-1, e.g. "[\'de\', \'en\', \'fr\']"')
            .option('--enable-pre-filter', 'enable bloom filter as pre filter')
            .option('--crawl-version [version]', 'common crawl version, e.g. "CC-MAIN-2017-13"')
            .option('--wet-range [from]:[to]', 'select a subset of WET files from CC, e.g. 0:420 (inclusive:exclusive)')
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
            add: this.commander.Add,
            deleteQueue: this.commander.DeleteQueue
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

        if (this.commander.blobAccess) {
            let split = this.commander.blobAccess.split(":", 2);
            if (split.length < 2) {
                console.warn("invalid --blob-access [account]:[accessKey]");
            } else {
                this.parameters["blobAccount"] = split[0];
                this.parameters["blobKey"] = split[1];
            }
        }

        if (this.commander.blobContainer) {
            this.parameters["blobContainer"] = this.commander.blobContainer;
        }

        if (this.commander.queueAccess) {
            let split = this.commander.queueAccess.split(":", 2);
            if (split.length < 2) {
                console.warn("invalid --queue-access [account]:[accessKey]");
            } else {
                this.parameters["queueAccount"] = split[0];
                this.parameters["queueKey"] = split[1];
            }
        }

        if (this.commander.queueName) {
            this.parameters["queueName"] = this.commander.queueName;
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