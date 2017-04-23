import ReadableStream = NodeJS.ReadableStream;
import * as cluster from "cluster";
import * as WARCStream from "warc";
import * as azure from "azure-storage";
import * as async from "async";
import {winston} from "./utils/logging";
import {WetManager} from "./wet-manager";
import {WebPageDigester} from "./webpage-digester";
import {Term} from "./utils/term";
import {LanguageExtractor} from "./language-extractor";
import {Storer} from "./storer";
import {WebPage} from "./utils/webpage";
import {BloomFilter} from "./filters/bloom-filter";
import {PrefixTree} from "./filters/prefix-tree";


export class Worker {

    private static worker : Worker;

    public static run() {

        // check if worker process
        if (!cluster.isWorker) { return; }

        // add event listeners to communicate with master
        process.on('message', (msg) => {

            // receiving worker parameters from master
            if (msg.init) {
                Worker.worker = new Worker(
                    msg.init.blobParams,
                    msg.init.dbParams,
                    msg.init.terms,
                    msg.init.heuristicThreshold,
                    msg.init.languageCodes,
                    msg.init.caching,
                    msg.init.enablePreFilter
                );

                let queueService = azure.createQueueService(
                    msg.init.queueParams.queueAccount,
                    msg.init.queueParams.queueKey
                );
                let queueName = msg.init.queueParams.queueName;

                queueService.createQueueIfNotExists(queueName, (err) => {
                    if (!err) {
                        Worker.startProcessing(queueService, queueName);
                    } else {
                        winston.error(err);
                        process.exit(1);
                    }
                });
            }
        });
    }

    private static startProcessing(queueService, queueName : string) {
        let getQueueItem = (callback?: (err?, item?) => void, retries? : number) => {
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
                    }, 5000);
                } else {
                    callback(err);
                }
            });
        };

        let deleteQueueItem = (item, callback?: (err?) => void, retries? : number) => {
            queueService.deleteMessage(queueName, item.messageId, item.popReceipt, (err) => {
                if (!err) {
                    callback();
                } else if (retries && retries > 0) {
                    setTimeout(() => {
                        deleteQueueItem(item, callback, retries - 1);
                    }, 5000);
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
                    return;
                }
                if (!item) {
                    winston.info("Queue is empty, exiting.");
                    process.exit(0);
                    return;
                }
                winston.info("Will start working on " + item.messageText);
                Worker.worker.workOn(item.messageText, (err) => {
                    if (!err) {
                        winston.info("Finished work on " + item.messageText);
                        deleteQueueItem(item, (err) => {
                            if (err) {
                                winston.error("Failed deleting file from queue");
                                winston.error(err);
                                process.exit(1);
                            } else {
                                winston.info("Removed " + item.messageText + "from queue");
                                next();
                            }
                        }, 5);
                    } else {
                        winston.error("Failed working on " + item.messageText, err);
                        process.exit(1);
                        return;
                    }
                });
            }, 5);
        };

        async.forever(doWork);
    }


    private webPageDigester : WebPageDigester;
    private storer : Storer;
    private caching : boolean;
    private languageCodes : Array<string>;
    private dbParameters : {[param : string] : string };
    private heuristicThreshold : number;


    /**
     * @param blobParams                                    Azure blob storage access data
     * @param dbParams                                      database access data
     * @param terms                                         Array of entities to filter for
     * @param heuristicThreshold                            threshold for heuristic
     * @param languageCodes                                 (optional) Array of languages to filter for
     * @param caching                                       (optional) enable WET file caching
     * @param enablePreFilter                               (optional) enable pre filter
     */
    private constructor (blobParams : {[param : string] : string }, dbParams : {[param : string] : string },
                         terms : Array<Term>, heuristicThreshold : number, languageCodes? : Array<string>,
                         caching? : boolean, enablePreFilter? : boolean) {

        this.webPageDigester = new WebPageDigester(terms).setFilter(PrefixTree);

        if (enablePreFilter) {
            this.webPageDigester.setPreFilter(BloomFilter);
        }

        this.caching = caching || false;
        this.languageCodes = languageCodes;
        this.storer = new Storer(blobParams["blobAccount"], blobParams["blobContainer"], blobParams["blobKey"]);
        this.dbParameters = dbParams;
        this.heuristicThreshold = heuristicThreshold;
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
    private workOn(wetPath : string, callback : (err? : Error) => void) {
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
            this.webPageDigester.digest(webPage);

            if (webPage.occurrences) {

                // calculate total number of matches
                let numTerms = 0;
                for (let occurrence of webPage.occurrences) {
                    numTerms += occurrence.positions.length;
                }

                // a web page has to have at least threshold^2 total matches and threshold entities
                let heuristicScore =
                    (webPage.occurrences.length >= this.heuristicThreshold) ? (numTerms / this.heuristicThreshold) : 0;

                // does the page match our heuristic?
                if (heuristicScore >= this.heuristicThreshold) {
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
                })
            });
        };

        // start processing chain
        this.storer.connectToDB(this.dbParameters, onStorerConnectedToDB);
    }
}