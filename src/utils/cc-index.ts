import {Downloader} from "./downloader";
import {winston} from "./logging";
import * as fs from"fs";

/**
 * Objects of this class represent responses from the CommonCrawl index.
 */
export class CCIndexResponse {

    public urlkey : string;
    public timestamp : string;
    public status : number;
    public url : string;
    public filename : string;
    public length : number;
    public mime : string;
    public offset : number;
    public digest : string;


}

/**
 * This class allows interaction with the CommonCrawl index to search for specific URLs.
 */
export class CCIndex {

    public defaultCCIndex : string;

    constructor(crawlVersion? : string) {
        this.defaultCCIndex = crawlVersion ? "http://index.commoncrawl.org/" + crawlVersion + "-index" : undefined;
    }


    /**
     * Takes a URL to look up, queries the CC index, parses the CC response and returns
     * an array of relative paths to all WET files that should include the URL.
     *
     * Either an error or at least one path are passed to the callback. If no WET files were found, an error is passed.
     *
     * @param lookupURL             URL to look up in the CC index
     * @param callback              will be called with an array of paths to WET files (array of strings)
     * @param timeout               (optional) max waiting time for the response
     * @param ccIndexPageURL        (optional) base URL of the CC index page; if not provided -> defaultCCIndex is used
     */
    public getWETPathsForURL(lookupURL : string,
                                    callback : (err? : Error, wetPaths? : Array<string>) => void,
                                    timeout? : number,
                                    ccIndexPageURL? : string ) {
        this.lookUpURL(lookupURL, (err, rawResponse) => {
            if (err) {  callback(err);       return; }

            // got a raw response -> parse it
            let resObjs = CCIndex.parseStringToCCIndexResponse(rawResponse);
            // and create WET paths
            let wetPaths = CCIndex.constructWETPaths(lookupURL, resObjs);

            if (wetPaths.length < 1) {
                callback(new Error("No WET files found for " + lookupURL));
            } else {
                callback(undefined, wetPaths);
            }


        }, timeout, ccIndexPageURL);

    }


    /**
     * Takes an array of URL to look up, queries the CC index, parses the CC responses and returns
     * an array of relative paths to WET files that should include the URLs. This function handles all errors.
     *
     * @param lookupURLs                    URLs to look up in the CC index
     * @param takeOnlyTheFirstWetPath       If set to TRUE, only one WET path will be returned for each URL (there might be multiple WETs for one URL)
     * @param callback                      Will be called with an array of relative wet paths (might be empty)
     * @param timeout               (optional) max waiting time for the response
     * @param ccIndexPageURL                (optional) base URL of the CC index page; if not provided -> defaultCCIndex is used
     */
    public getWETPathsForEachURL(lookupURLs : Array<string>,
                                        takeOnlyTheFirstWetPath : boolean,
                                        callback : (wetPaths : Array<string>) => void,
                                        timeout? : number,
                                        ccIndexPageURL? : string) {

        let wets : Set<string> = new Set<string>();
        winston.info("start looking up " + lookupURLs.length + " urls");

        // We can't send 100500 requests at the same time, instead we:
        //  - query cc index with one url,
        //  - wait for the response,
        //  - then call itself recursively to resolve the next URL
        function scaryRecursiveCallbackStuff(lookupIndex : number) {

            // terminate when index reaches endUrlIndex
            if (lookupIndex >= lookupURLs.length) {
                let wetPaths = Array.from(wets);
                callback(wetPaths);
                return;
            }

            let urlToLookUp = lookupURLs[lookupIndex];
            let progress = "[" + (lookupIndex+1) + "/" + (lookupURLs.length) + "]";

            // skip urls that contain "category:"
            // CC index returns nothing for all of them
            if (urlToLookUp.toLowerCase().includes("category:") &&
                urlToLookUp.toLowerCase().includes("wikipedia")) {
                console.log(progress + " skip " + urlToLookUp + " (includes strings 'category:' & 'wikipedia')");
                scaryRecursiveCallbackStuff(lookupIndex+1);
                return;
            }


            console.log(progress + " looking up " + urlToLookUp);

            // look up single url
            this.getWETPathsForURL(lookupURLs[lookupIndex], function (err, wetPaths) {
                // log error but continue anyway
                if (err) {
                    console.log("      :(  error: " + err.message);
                } else {
                    console.log("      :)  resolved " + wetPaths.length + " wet paths for " + urlToLookUp);

                    if (takeOnlyTheFirstWetPath) {
                        wets.add(wetPaths[0]);
                        console.log("      :)  added first wet to the set, it now has " + wets.size + " paths");
                    } else {
                        for(let wet of wetPaths) wets.add(wet);
                        console.log("      :)  added all wets to the set, it now has " + wets.size + " paths");
                    }

                }

                scaryRecursiveCallbackStuff(lookupIndex+1);

            }, timeout, ccIndexPageURL);

        }

        scaryRecursiveCallbackStuff(0);



    }


    /**
     * Takes an array of URL to look up, queries the CC index, parses the CC responses and returns
     * an array of relative paths to WET files that should include the URLs. This function handles all errors.
     *
     * The main difference to getWETPathsForEachURL() is step by step resolving.
     * After stepSize urls were resolved, we save the result on disk. This prevents data loss in case something goes
     * wrong during the resolving.
     *
     * @param lookupURLs                    URLs to look up in the CC index
     * @param takeOnlyTheFirstWetPath       If set to TRUE, only one WET path will be returned for each URL (there might be multiple WETs for one URL)
     * @param outputFile                    file for temporary storage and backup
     * @param stepSize                      how many files should be resolved in one step (between backup)
     * @param callback                      Will be called with an array of relative wet paths (might be empty)
     * @param startResolvingFrom            (optional) if there was an error before, you can resolving from this entry
     * @param timeout                       (optional) max waiting time for the response
     * @param ccIndexPageURL                (optional) base URL of the CC index page; if not provided -> defaultCCIndex is used
     */
    public getWETPathsForEachURLStepByStep(lookupURLs : Array<string>,
                                                  takeOnlyTheFirstWetPath : boolean,
                                                  outputFile : string,
                                                  stepSize : number,
                                                  callback : (allWets : Array<string>) => void,
                                                  startResolvingFrom? : number,
                                                  timeout? : number,
                                                  ccIndexPageURL? : string) {

        function doStep(start : number) {
            start = Math.min(start, lookupURLs.length-1);

            let end = start + stepSize;
            end = Math.min(end, lookupURLs.length);

            console.log("starting new step, resolving entries from " + (start+1) + " to " + end + "  (total number: " + lookupURLs.length + ")");

            let selectedUrls = lookupURLs.slice(start, end);
            this.getWETPathsForEachURL(selectedUrls, takeOnlyTheFirstWetPath, function allLookedUp(wetPaths) {
                // save resolved paths along with the old ones
                let allWets = new Set<string>();
                for (let newWet of wetPaths) allWets.add(newWet);

                console.log(">> resolved " + wetPaths.length + " new path(s)");

                // read old if exists
                if (fs.existsSync(outputFile)) {
                    let oldWets = JSON.parse(fs.readFileSync(outputFile).toString("utf8"));
                    for (let oldWet of oldWets) allWets.add(oldWet);

                    console.log(">> found " + oldWets.length + " old path(s), merging with new ones");
                }

                // save result
                let allWetsArray = Array.from(allWets);
                console.log(">> writing " + allWetsArray.length + " path(s) to " + outputFile);
                let ws = fs.createWriteStream(outputFile);
                ws.write(JSON.stringify(allWetsArray));
                ws.end();
                ws.on('close', () => {
                    if (end < lookupURLs.length) {

                        // repeat
                        console.log(">> step done, repeating for next entries\n");
                        // start from where we stopped right now
                        doStep(end);
                    } else {
                        console.log(">> last step finished!\n");
                        if (callback) callback(allWetsArray);
                    }
                }); // ws on close

            }, timeout, ccIndexPageURL);// CCIndex.getWETPathsForEachURL

        } // doStep(...)

        doStep(startResolvingFrom | 0);

    }




    /**
     * [HELPER FUNCTION]
     * Query the CC index with a URL and call the callback with the RAW response string.
     *
     * @param lookupURL             URL to look up in the CC index
     * @param callback              (optional) will be called with the response body string; if not provided -> output to console
     * @param timeout               (optional) max waiting time for the response
     * @param ccIndexPageURL        (optional) base URL of the CC index page; if not provided -> defaultCCIndex is used
     */
    private lookUpURL(lookupURL : string,
                             callback? : (err? : Error, body? : string) => void,
                             timeout? : number,
                             ccIndexPageURL? : string) {

        lookupURL = lookupURL.replace("https://", "").replace("http://", ""); // remove http(s)
        let indexPage = ccIndexPageURL || this.defaultCCIndex;
        if (!indexPage) callback(new TypeError("No CC index page was supplied!"));

        let query = indexPage + "?url=" + encodeURI(lookupURL) + "&output=json";

        let status = 'waiting';

        Downloader.getResponse(query, (err, res) => {
            if (err) {
                if (callback) {
                    callback(err);
                } else {
                    winston.error(err);
                }
                return;
            }


            // get full response
            let body = '';
            res.on('data', (chunk) => {
               body += chunk;
            });
            res.on('end', () => {
                if (status == 'waiting') {
                    status = 'done';
                    if (callback) callback(undefined, body);
                }
            });
            res.on('aborted', () => {
                if (status == 'waiting') {
                    status = 'aborted';
                    if (callback) callback(new Error("request aborted!"));
                }
            });

        }, timeout);

        // test timeout, already implemented in Downloader, this can be removed
        setTimeout(function() {
            if (status == 'waiting') { // we are still waiting
                status = 'aborted';
                if (callback) callback(new Error("request aborted after timeout!"));
            }
        }, timeout ? timeout + 1000 : 5000);
    }

    /**
     * [HELPER FUNCTION]
     * Convert each line of the response to a CCIndexResponse object and return and array of those objects.
     *
     * @param resp      CC index response string
     * @returns {Array} array of response objects
     */
    private static parseStringToCCIndexResponse(resp : string) : Array<CCIndexResponse> {
        let result : Array<CCIndexResponse> = [];

        let lines = resp.split(/\n/);
        for (let line of lines) {
            if (line.length < 2) continue; // ignore empty/short lines
            let json;
            try {
                json = JSON.parse(line);
            } catch (e) {
                continue; // ignore invalid JSONs
            }

            if (json.hasOwnProperty("error")) {
                continue;
            }

            // line is ok, test for properties (strict! may not be supported for older crawls!)
            if (!json.hasOwnProperty("urlkey")) continue;
            if (!json.hasOwnProperty("timestamp")) continue;
            if (!json.hasOwnProperty("status")) continue;
            if (!json.hasOwnProperty("url")) continue;
            if (!json.hasOwnProperty("filename")) continue;
            if (!json.hasOwnProperty("length")) continue;
            if (!json.hasOwnProperty("mime")) continue;
            if (!json.hasOwnProperty("offset")) continue;
            if (!json.hasOwnProperty("digest")) continue;

            // create cc index response object
            let resObj = new CCIndexResponse();
            resObj.urlkey = json.urlkey;
            resObj.timestamp = json.timestamp;
            resObj.status = parseInt(json.status);
            resObj.url = json.url;
            resObj.filename = json.filename;
            resObj.length = parseInt(json.length);
            resObj.mime = json.mime;
            resObj.offset = parseInt(json.offset);
            resObj.digest = json.digest;

            result.push(resObj);
        }

        return result;

    }

    /**
     * [HELPER FUNCTION]
     *
     * For each 200-response, the WARC path is converted to a WET path.
     * All paths are returned as a string array (no duplicates). Each returned path should start with "crawl-data/...".
     *
     * This function also checks if the lookup URL is included in the CC index response.
     * If this is not the case, a warning will be shown.
     *
     * @param lookupURL             URL to look up
     * @param resObjs               parsed response objects from the CC index
     * @returns {Array<string>}     (relative) paths to WET files that contain websites with given url
     */
    private static constructWETPaths(lookupURL : string, resObjs : Array<CCIndexResponse>) : Array<string> {
        lookupURL = lookupURL.replace("https://", "").replace("http://", ""); // remove http(s)

        let paths = new Set();

        for (let resObj of resObjs ) {
            if (resObj.status != 200) continue; // we only want 200 responses

            // our input data might have partially encoded uris -> decode & encode again before comparison
            let formattedResponseURL = encodeURIComponent(decodeURIComponent(resObj.url.toLowerCase())).toLowerCase();
            let formattedLookupURL = encodeURIComponent(decodeURIComponent(lookupURL.toLowerCase())).toLowerCase();

            if (!formattedResponseURL.includes(formattedLookupURL)) {
                winston.warn("CC index response (" + formattedResponseURL +  ") doesn't contain the lookup URL (" + formattedLookupURL + ")!");
                //continue;
            }

            // response seems to be valid, convert WARC path to WET path
            let wetPath = resObj.filename.replace("/warc/", "/wet/").replace("warc.gz", "warc.wet.gz");
            paths.add(wetPath);
        }

        return Array.from(paths);


    }


}