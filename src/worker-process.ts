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
                    msg.terms,
                    new Storer(
                        params.all.blobParams,
                        (params.all.useJson) ? undefined : params.all.dbParams
                    ),
                    {
                        heuristicThreshold: params.all.heuristicThreshold,
                        heuristicLimit: params.all.heuristicLimit,
                        avgLineLength: params.all.avgLineLength
                    },
                    {
                        languageCodes: params.all.languageCodes,
                        caching: params.all.caching,
                        enablePreFilter: params.all.enablePreFilter,
                    }
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

    private languageExtractor : LanguageExtractor;
    private webPageDigester : WebPageDigester;
    private storer : Storer;
    private caching : boolean;
    private heuristicThreshold : number;
    private heuristicLimit : number;
    private avgLineLength : number;


    /**
     * @param terms                                         Array of entities to filter for
     * @param storer                                        Storer for saving results
     * @param filterParams                                  Filter settings
     * @param options                                       (optional) optional parameters
     */
    public constructor (terms : Array<Term>, storer : Storer,
                        filterParams : { heuristicThreshold : number, heuristicLimit : number, avgLineLength : number },
                        options? : { caching? : boolean, languageCodes: Array<string>, enablePreFilter : boolean }) {

        this.webPageDigester = new WebPageDigester(terms).setFilter(PrefixTree);

        this.storer = storer;
        this.heuristicThreshold = filterParams.heuristicThreshold;
        this.heuristicLimit = filterParams.heuristicLimit;
        this.avgLineLength = filterParams.avgLineLength;

        if (options) {
            this.caching = options.caching || false;
            if (options.languageCodes && options.languageCodes.length > 0) {
                this.languageExtractor = new LanguageExtractor(new Set(options.languageCodes));
            }
            if (options.enablePreFilter) {
                this.webPageDigester.setPreFilter(BloomFilter);
            }
        }
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
    public workOn(wetPath : string, callback? : (err? : Error) => void) {
        let streamFinished = false;
        let pendingPages = 0;


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
         * Gets called once a WET entry has been parsed. Converts WET entry into WebPage object and detects language
         * @param data
         */
        let onWetEntry = (data : {protocol : string, headers : {[header : string] : string}, content : Buffer}) => {
            pendingPages++;

            let webPage = new WebPage(data).shrinkContent(this.avgLineLength);

            if (this.languageExtractor) {
                this.languageExtractor.matches(webPage, (result?) => {
                    if(result) {
                        onLanguageMatch(webPage);
                    } else {
                        onWetEntryFinished();
                    }
                });
            } else {
                onLanguageMatch(webPage);
            }
        };

        /**
         * Gets called when the page language matches
         * Attaches occurrences to page and calculates heuristic
         * @param webPage
         */
        let onLanguageMatch = (webPage : WebPage) => {
            this.webPageDigester.digest(webPage);

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
                    this.storer.storeWebsite(webPage);
                }
            }
            onWetEntryFinished();
        };

        /**
         * Gets called when a WET entry has been processed.
         */
        let onWetEntryFinished = () => {
            pendingPages--;
            if (streamFinished && pendingPages === 0) {
                onFileFinished();
            }
        };

        /**
         * Gets called when all entries have been processed
         * Flushes Storer cache, so the web pages get finally offloaded to Azure / DB
         */
        let onFileFinished = () => {
            this.storer.flush((err) => {
                if (callback) callback(err);
            }, 60);
        };

        // start processing chain
        WetManager.loadWetAsStream(wetPath, onFileStreamReady, this.caching);
    }
}