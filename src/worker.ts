import ReadableStream = NodeJS.ReadableStream;
import events = require('events'); // temporaty fix
import * as WARCStream from "warc";
import {WetManager} from "./wet-manager";
import {WebPageDigester} from "./webpage-digester";
import {Entity} from "./utils/entity";
import {LanguageExtractor} from "./language-extractor";
import {Storer} from "./storer";
import {WebPage} from "./utils/webpage";
import {BloomFilter} from "./filters/bloom-filter";
import {PrefixTree} from "./filters/prefix-tree";


export class Worker extends events.EventEmitter {

    private static lastID = 0;

    private webPageDigester : WebPageDigester;
    private caching : boolean;
    private languageCodes : Array<string>;
    private workerID : number;


    /**
     * @param entities                                      Array of entities to filter for
     * @param caching                                       (optional) enable WET file caching
     * @param languageCodes                                 (optional) Array of languages to filter for
     */
    constructor (entities : Array<Entity>, caching? : boolean, languageCodes? : Array<string>) {
        super();
        this.webPageDigester = new WebPageDigester(entities)
            .setPreFilter(BloomFilter)
            .setFilter(PrefixTree);

        this.caching = caching || process.env.caching || false;
        this.languageCodes = languageCodes || process.env.languageCodes;
        this.workerID = Worker.lastID++;
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
        WetManager.loadWetAsStream(wetPath, this.onFileStreamReady, this.caching);

    }

    /**
     * Gets called once the unpacked WET stream starts and pipes stream to WARC parser
     * Parses WET entries and then calls for each of them 'onWARCdata'
     * @param err
     * @param response
     */
    private onFileStreamReady(err? : Error, response? : ReadableStream) : void {
        if(err || !response) {
            // TODO: Proper error handling!
            console.warn("WETManager encountered an error!");
        } else {
            let warcParser = new WARCStream();
            response.pipe(warcParser).on("data", this.onWARCdata);
        }
    }

    /**
     * Gets called once a WET entry has been parsed. Converts WET entry into WebPAge object and adds occurrences
     * Detects language and then calls 'onResult'
     * @param data
     */
    private onWARCdata(data : {protocol : string, headers : {[header : string] : string}, content : Buffer}) {
        let webPage = new WebPage(data);
        this.webPageDigester.digest(webPage);

        if (webPage.occurrences && webPage.occurrences.length > 0) {
            if (this.languageCodes && this.languageCodes.length > 0) {

                LanguageExtractor.isWebPageInLanguage(webPage, this.languageCodes, (err, result?) => {
                    if(result) { this.onResult(webPage); }
                });

            } else {
                this.onResult(webPage);
            }
        }
    }

    /**
     * Gets called for every matching WebPage object. Stores web page in cloud and DB
     * @param webPage
     */
    private onResult(webPage : WebPage) {
        Storer.storeWebsite(webPage);
        this.emit("finished");
    }
}