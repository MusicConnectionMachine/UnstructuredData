import ReadableStream = NodeJS.ReadableStream;
import * as cluster from "cluster";
import {EventEmitter} from "events";
import * as WARCStream from "warc";
import {WetManager} from "./wet-manager";
import {WebPageDigester} from "./webpage-digester";
import {Term} from "./utils/term";
import {LanguageExtractor} from "./language-extractor";
import {Storer} from "./storer";
import {WebPage} from "./utils/webpage";
import {BloomFilter} from "./filters/bloom-filter";
import {PrefixTree} from "./filters/prefix-tree";


export class Worker extends EventEmitter {

    private static worker : Worker;

    public static run() {

        // check if worker process
        if (!cluster.isWorker) { return; }

        // add event listeners to communicate with master
        process.on('message', (msg) => {

            // receiving entities from master
            if (msg.entities) {
                Worker.worker = new Worker(msg.entities);
                Worker.worker.on('finished', () => {
                    process.send({needWork: true});
                });
                process.send({needWork: true});
            }

            // receiving WET path
            else if (msg.work && Worker.worker) {
                Worker.worker.workOn(msg.work);
            }

            // all WET files have been processed
            else if (msg.finished) {
                process.exit(0);
            }
        });
    }


    private webPageDigester : WebPageDigester;
    private storer : Storer;
    private caching : boolean;
    private languageCodes : Array<string>;
    private processID : number;


    /**
     * @param entities                                      Array of entities to filter for
     * @param caching                                       (optional) enable WET file caching
     * @param languageCodes                                 (optional) Array of languages to filter for
     */
    constructor (entities : Array<Term>, caching? : boolean, languageCodes? : Array<string>) {
        super();
        this.webPageDigester = new WebPageDigester(entities)
            .setPreFilter(BloomFilter)
            .setFilter(PrefixTree);

        this.caching = caching || process.env.caching || false;
        this.languageCodes = languageCodes || process.env.languageCodes;
        this.storer = new Storer();
        this.processID = process.pid;
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
     */
    public workOn(wetPath : string) {
        let streamFinished = false;
        let pendingPages = 0;

        /**
         * Gets called once the unpacked WET stream starts and pipes stream to WARC parser
         * Parses WET entries and then calls for each of them 'onWARCdata'
         * @param err
         * @param response
         */
        let onFileStreamReady = (err? : Error, response? : ReadableStream) => {
            if(err || !response) {
                // TODO: Proper error handling!
                console.warn("WETManager encountered an error!");
            } else {
                let warcParser = new WARCStream();
                response.pipe(warcParser)
                    .on("data", onWetEntry)
                    .on('end', () => {
                        streamFinished = true;
                        if (pendingPages === 0) {
                            this.emit('finished');
                        }
                    });
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

            // do have a match, aka has the page occurrences attached to it?
            if (webPage.occurrences && webPage.occurrences.length > 0) {
                onTermMatch(webPage);
            } else {
                onWetEntryFinished();
            }
        };

        /**
         * Gets called when a web page matches a term. Does language detection if required
         * @param webPage
         */
        let onTermMatch = (webPage : WebPage) => {

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
            console.log(webPage);
            onWetEntryFinished();
        };

        /**
         * Gets called when a WET entry has been processed. Emits event when work on WET file is finished
         */
        let onWetEntryFinished = () => {
            pendingPages--;
            if (streamFinished && pendingPages === 0) {
                this.emit('finished');
            }
        };

        // start processing chain
        WetManager.loadWetAsStream(wetPath, onFileStreamReady, this.caching);
    }
}