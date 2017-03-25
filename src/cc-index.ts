import {Downloader} from "./downloader";

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

    public static defaultCCIndex = "http://index.commoncrawl.org/CC-MAIN-2017-04-index";


    /**
     * Main function to interact with the CommonCrawl index.
     * Takes a URL to look up, queries the CC index, parses the CC response and returns
     * an array of relative paths to all WET files tha should include the URL.
     *
     * Either an error or at least one path are passed to the callback. If no WET files were found, an error is passed.
     *
     * @param lookupURL             URL to look up in the CC index
     * @param callback              will be called with an array of paths to WET files (set of strings)
     * @param ccIndexPageURL        (optional) base URL of the CC index page; if not provided -> defaultCCIndex is used
     */
    public static getWETPathsForURL(lookupURL : string,
                                    callback : (err? : Error, wetPaths? : Array<string>) => void,
                                    ccIndexPageURL? : string ) {
        CCIndex.lookUpURL(lookupURL, (err, rawResponse) => {
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


        }, ccIndexPageURL);

    }


    /**
     * [HELPER FUNCTION]
     * Query the CC index with a URL and call the callback with the RAW response string.
     *
     * @param lookupURL             URL to look up in the CC index
     * @param callback              (optional) will be called with the response body string; if not provided -> output to console
     * @param ccIndexPageURL        (optional) base URL of the CC index page; if not provided -> defaultCCIndex is used
     */
    private static lookUpURL(lookupURL : string,
                            callback? : (err? : Error, body? : string) => void,
                            ccIndexPageURL? : string) {

        lookupURL = lookupURL.replace("https://", "").replace("http://", ""); // remove http(s)
        let indexPage = ccIndexPageURL || CCIndex.defaultCCIndex;

        let query = indexPage + "?url=" + encodeURI(lookupURL) + "&output=json";

        Downloader.getResponse(query, (err, res) => {
            if (err) {
                if (callback) callback(err); else console.error(err);
                return;
            }

            // get full response
            let body = '';
            res.on('data', (chunk) => {
               body += chunk;
            });
            res.on('end', () => {
                if (callback) callback(undefined, body); else console.log("response body for " + lookupURL + ":\n" + body);
            });

        });
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

            if (!resObj.url.toLowerCase().includes(lookupURL.toLowerCase())) {
                console.warn("CC index response (" + resObj.url +  ") doesn't contain the lookup URL (" + lookupURL + ")!");
                //continue;
            }

            // response seems to be valid, convert WARC path to WET path
            let wetPath = resObj.filename.replace("/warc/", "/wet/").replace("warc.gz", "warc.wet.gz");
            paths.add(wetPath);
        }

        return Array.from(paths);


    }


}