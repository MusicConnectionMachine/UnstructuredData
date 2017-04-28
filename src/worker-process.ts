import ReadableStream = NodeJS.ReadableStream;
import * as cluster from "cluster";
import * as WARCStream from "warc";
import * as azure from "azure-storage";
import * as async from "async";
import {winston} from "./utils/logging";
import {params} from "./utils/param-loader";
import {WetManager} from "./wet-manager";
import {WebPageDigester} from "./webpage-digester";
import {Term} from "./classes/term";
import {LanguageExtractor} from "./language-extractor";
import {Storer} from "./storer";
import {WebPage} from "./classes/webpage";
import {BloomFilter} from "./filters/bloom-filter";
import {PrefixTree} from "./filters/prefix-tree";


export class WorkerProcess {

    private static worker: Worker;

    public static run() {

        // check if worker process
        if (!cluster.isWorker) {
            return;
        }

        winston.info('Worker process created and running');

        // add event listeners to communicate with master
        process.on('message', (msg) => {

            // receiving worker parameters from master
            if (msg.terms) {

                winston.info("Received " + msg.terms.length + " terms!");

                WorkerProcess.worker = new Worker(
                    params.all.blobParams,
                    params.all.dbParams,
                    msg.terms,
                    params.all.heuristicThreshold,
                    params.all.heuristicLimit,
                    params.all.languageCodes,
                    params.all.caching,
                    params.all.enablePreFilter
                );

                WorkerProcess.startProcessing();
            }
        });
    }

    private static startProcessing() {

        let queueService = azure.createQueueService(
            params.all.queueParams.queueAccount,
            params.all.queueParams.queueKey
        );
        let queueName = params.all.queueParams.queueName;

        let getQueueItem = (callback?: (err?, item?) => void, retries?: number) => {
            queueService.getMessages(queueName, {visibilityTimeout: 30 * 60}, (err, result) => {
                if (!err) {
                    // check if queue is empty
                    if (result && result.length > 0) {
                        callback(undefined, result[0]);
                    } else {
                        callback();
                    }
                } else if (retries && retries > 0) {
                    setTimeout(() => {
                        getQueueItem(callback, retries - 1);
                    }, 60000);
                } else {
                    callback(err);
                }
            });
        };

        let deleteQueueItem = (item, callback?: (err?) => void, retries?: number) => {
            queueService.deleteMessage(queueName, item.messageId, item.popReceipt, (err) => {
                if (!err) {
                    callback();
                } else if (retries && retries > 0) {
                    setTimeout(() => {
                        deleteQueueItem(item, callback, retries - 1);
                    }, 60000);
                } else {
                    callback(err);
                }
            });
        };

        let doWork = (next) => {
            getQueueItem((err, item) => {
                if (err) {
                    winston.error("Failed getting file from queue", err);
                    process.exit(1);
                }
                if (!item) {
                    winston.info("Queue is empty, exiting.");
                    process.exit(0);
                }
                winston.info("Will start working on: " + item.messageText);
                WorkerProcess.worker.workOn(item.messageText, (err) => {
                    if (!err) {
                        winston.info("Finished work on: " + item.messageText);
                        deleteQueueItem(item, (err) => {
                            if (err) {
                                winston.error("Failed deleting file from queue", err);
                                process.exit(1);
                            } else {
                                winston.info("Removed from queue: " + item.messageText);
                                next();
                            }
                        }, 60);
                    } else {
                        winston.error("Failed working on: " + item.messageText, err);
                        process.exit(1);
                    }
                });
            }, 60);
        };

        async.forever(doWork);
    }
}

class Worker {

    private webPageDigester : WebPageDigester;
    private storer : Storer;
    private caching : boolean;
    private languageCodes : Array<string>;
    private dbParameters : {[param : string] : string };
    private heuristicThreshold : number;
    private heuristicLimit : number;


    /**
     * @param blobParams                                    Azure blob storage access data
     * @param dbParams                                      database access data
     * @param terms                                         Array of entities to filter for
     * @param heuristicThreshold                            threshold for heuristic
     * @param heuristicLimit                                limit for heuristic
     * @param languageCodes                                 (optional) Array of languages to filter for
     * @param caching                                       (optional) enable WET file caching
     * @param enablePreFilter                               (optional) enable pre filter
     */
    public constructor (blobParams : {[param : string] : string }, dbParams : {[param : string] : string },
                        terms : Array<Term>, heuristicThreshold : number, heuristicLimit : number,
                        languageCodes? : Array<string>, caching? : boolean, enablePreFilter? : boolean) {

        this.webPageDigester = new WebPageDigester(terms).setFilter(PrefixTree);

        if (enablePreFilter) {
            this.webPageDigester.setPreFilter(BloomFilter);
        }

        this.caching = caching || false;
        this.languageCodes = languageCodes;
        this.storer = new Storer(blobParams["blobAccount"], blobParams["blobContainer"], blobParams["blobKey"]);
        this.dbParameters = dbParams;
        this.heuristicThreshold = heuristicThreshold;
        this.heuristicLimit = heuristicLimit;
    }



    /**
     * Runs the entire processing chain on a WET file specified by the CC path
     * 1. downloads file from CC
     * 2. parses data into WebPage objects
     * 3. adds occurrences to web pages
     * 4. filters language
     * 5. stores web page
     *
     * @param wetPath                                       CC path to WET file
     * @param callback                                      gets called when all pages have been processed
     */
    public workOn(wetPath : string, callback : (err? : Error) => void) {
        let streamFinished = false;
        let pendingPages = 0;

        /**
         * Let's connect to DB before we load the first WET.
         * @param err     not used right now
         */
        let onStorerConnectedToDB = (err) => {
            if (err) {
                winston.error("Failed connecting to DB, retrying in 60 seconds.", err);
                return setTimeout(this.storer.connectToDB(this.dbParameters, onStorerConnectedToDB), 60000);
            }
            WetManager.loadWetAsStream(wetPath, onFileStreamReady, this.caching);
        };

        /**
         * Gets called once the unpacked WET stream starts and pipes stream to WARC parser
         * Parses WET entries and then calls for each of them 'onWARCdata'
         * @param err
         * @param response
         */
        let onFileStreamReady = (err? : Error, response? : ReadableStream) => {
            if(err) {
                callback(err);
                return;
            } else if (response){

                let warcParser = new WARCStream();
                response.pipe(warcParser)
                    .on("data", onWetEntry)
                    .on('end', () => {
                        streamFinished = true;
                        if (pendingPages === 0) {
                            onFileFinished();
                        }
                    });
            } else {
                callback(new Error("Couldn't load file!"));
                process.exit(1);
            }
        };

        /**
         * Gets called once a WET entry has been parsed. Converts WET entry into WebPAge object and adds occurrences
         * Detects language and then calls 'onResult'
         * @param data
         */
        let onWetEntry = (data : {protocol : string, headers : {[header : string] : string}, content : Buffer}) => {
            pendingPages++;

            let webPage = new WebPage(data);
            this.webPageDigester.digest(webPage.shrinkContent(params.all.avgLineLength));

            if (webPage.occurrences) {

                // calculate total number of matches
                let numTerms = 0;
                for (let occurrence of webPage.occurrences) {
                    numTerms += occurrence.positions.length;
                }
                // a web page has to have at least threshold^2 total matches and threshold entities
                let thresholdSquared = this.heuristicThreshold * this.heuristicThreshold;
                let limitSquared = this.heuristicLimit * this.heuristicLimit;
                let heuristicScore =
                    (this.heuristicThreshold <= webPage.occurrences.length
                    && webPage.occurrences.length < this.heuristicLimit) ? numTerms : 0;

                if (thresholdSquared <= heuristicScore && heuristicScore < limitSquared) {
                    onHeuristicMatch(webPage);
                } else {
                    onWetEntryFinished();
                }
            } else {
                onWetEntryFinished();
            }
        };

        /**
         * Gets called when a web page matches a term. Does language detection if required
         * @param webPage
         */
        let onHeuristicMatch = (webPage : WebPage) => {

            // no language codes specified, we can skip language detection
            if (!this.languageCodes || this.languageCodes.length === 0) {
                onPageMatch(webPage);
                return;
            }

            LanguageExtractor.isWebPageInLanguage(webPage, this.languageCodes, (err, result?) => {
                if(result) {
                    onPageMatch(webPage);
                } else {
                    onWetEntryFinished();
                }
            });
        };

        /**
         * Gets called for every term and language matching WebPage object. Stores web page in cloud and DB
         * @param webPage
         */
        let onPageMatch = (webPage : WebPage) => {
            this.storer.storeWebsite(webPage, onWetEntryFinished);
        };

        /**
         * Gets called when a WET entry has been processed. Emits event when work on WET file is finished
         */
        let onWetEntryFinished = () => {
            pendingPages--;
            if (streamFinished && pendingPages === 0) {
                onFileFinished();
            }
        };

        let onFileFinished = () => {
            this.storer.flushBlob(err => {
                if(err) {
                    return callback(err);
                }
                this.storer.flushDatabase(err => {
                    if(err) {
                        return callback(err);
                    }
                    callback();
                }, 60)
            }, 60);
        };

        // start processing chain
        this.storer.connectToDB(this.dbParameters, onStorerConnectedToDB);
    }
}