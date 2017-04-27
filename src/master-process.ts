import * as cluster from "cluster";
import * as readLine from "readline";
import * as fs from "fs";
import * as azure from "azure-storage";
import * as async from "async";
import {winston} from "./utils/logging";
import {TermLoader} from "./utils/term-loader";
import {Term} from "./classes/term";
import {CLI} from "./utils/cli";
import {params} from "./utils/param-loader";
import {CCPathLoader} from "./utils/cc-path-loader";


export class MasterProcess {

    private static queueService = azure.createQueueService(
        params.all.queueParams.queueAccount,
        params.all.queueParams.queueKey
    );
    private static queueName = params.all.queueParams.queueName;


    public static run() {

        // check if master process
        if (!cluster.isMaster) return;

        winston.info('Master process created and running');

        let flags = CLI.getInstance().flags;


        let afterAdd = () => {
            if (flags["monitor"]) MasterProcess.monitorQueue();
            if (flags["process"]) MasterProcess.processQueue();
        };

        if (flags["deleteQueue"]) {
            MasterProcess.deleteQueue(() => {
                process.exit(0);
            });
        } else if (flags["add"]){
            MasterProcess.populateQueue(afterAdd);
        } else {
            afterAdd();
        }
    }

    private static deleteQueue(callback? : () => void) {
        MasterProcess.queueService.deleteQueueIfExists(MasterProcess.queueName, (err) => {
            if (err) winston.error(err);
            callback();
        });
    }

    private static monitorQueue() {
        let queueSize : number;

        let checkProgress = (cb?: (err?: Error) => void, retries?: number) => {
           MasterProcess.queueService.getQueueMetadata(MasterProcess.queueName, (err, result) => {
               if (!err) {
                   if (queueSize !== result.approximateMessageCount) {
                       queueSize = result.approximateMessageCount;
                       winston.info("Current approximate queue size: " + queueSize);
                   }
                   if (cb) cb();
               } else if (retries) {
                   checkProgress(cb, retries - 1);
               } else {
                   winston.error("Couldn't fetch queue size!", err);
                   if (cb) cb(err);
               }
           });
        };

        // while queue size is bigger than 0 check progress every second
        async.doWhilst((cb) => {
            checkProgress(() => {
                setTimeout(cb, 1000);
            }, 5);
        }, () => {return queueSize > 0});

    }

    private static populateQueue(callback? : () => void) {

        let paths : Array<string>;

        let onQueueReady = () => {
            new CCPathLoader(params.all.crawlVersion).loadPaths((err, result) => {
                if (!err && result) {
                    paths = result.slice(params.all.wetFrom, params.all.wetTo);
                    winston.info("Successfully loaded " + paths.length + " paths.");
                    onPathsLoaded();
                } else {
                    winston.error("Failed to load common crawl paths", err);
                }
            });
        };

        let onPathsLoaded = () => {
            let pushed = 0;

            // iterate over all paths and push then to the queue, 20 at a time
            async.mapLimit(paths, 20, (path, cb) => {
                pushPath(path, (err) => {
                    if (err) {
                        winston.error("Failed to push to queue: " + path, err);
                    } else {
                        winston.info("Pushed " + (++pushed) + "/" + paths.length + " successfully to queue: " + path);
                    }
                    cb();
                }, 5);
            }, callback);
        };

        let pushPath = (path: string, callback?: (err?: Error) => void, retries?: number) => {
            MasterProcess.queueService.createMessage(MasterProcess.queueName, path, (err) => {
                if (err && retries) {
                    pushPath(path, callback, retries - 1);
                } else {
                    callback(err);
                }
            });
        };

        MasterProcess.queueService.createQueueIfNotExists(MasterProcess.queueName, (err) => {
            if (!err) {
                onQueueReady();
            } else {
                winston.error(err);
            }
        });
    }

    private static processQueue() {

        let terms : Array<Term> = [];
        let termBlacklist : Set<string> = new Set();

        let loadBlacklist = () => {
            if (fs.existsSync("./term-blacklist.txt")) {
                let lineReader = readLine.createInterface({input: fs.createReadStream("./term-blacklist.txt")});
                lineReader.on('line', (line) => {
                    termBlacklist.add(line);
                });
                lineReader.on('close', () => {
                    loadTerms();
                });
            } else {
                loadTerms();
            }
        };

        let loadTerms = () => {

            TermLoader.loadFromDB(params.all.dbParams, (err : Error, result : Array<Term>) => {
                if (err) {
                    winston.error(err);
                    process.exit(1);
                }

                // check length of terms
                for (let term of result) {
                    if (term.value !== null && !termBlacklist.has(term.value) && term.value.length > 2) {
                        terms.push(term);
                    }
                }
                winston.info("Successfully loaded " + terms.length + " terms!");

                spawnProcesses();
            });
        };

        let spawnProcesses = () => {

            for (let i = 0; i < params.all.processes; i++) {

                let worker = cluster.fork();

                worker.on('exit', (code) => {
                    winston.info('Worker-' + worker.process.pid + ' exited with code ' + code);
                });

                // init worker
                worker.send({
                    terms: terms
                });

                winston.info("Successfully spawned worker process " + worker.process.pid + "!");
            }
        };

        loadBlacklist();
    }
}

