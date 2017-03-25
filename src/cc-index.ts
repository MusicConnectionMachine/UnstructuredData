import {Downloader} from "./downloader";


export class CCIndex {

    public static defaultCCIndex = "http://index.commoncrawl.org/CC-MAIN-2017-04-index";


    /**
     * Queries the CC index with a URL and calls the callback with the RAW response string.
     *
     * @param lookupURL             URL to look up in the CC index
     * @param callback              (optional) will be called with the response body string; if not provided -> output to console
     * @param ccIndexPageURL        (optional) base URL of the CC index page; if not provided -> defaultCCIndex is used
     */
    public static lookUpURL(lookupURL : string,
                            callback? : (err? : Error, body? : string) => void,
                            ccIndexPageURL? : string) {

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


    public static parseCCIndexResponse(resp : string) : Array<Object> {
        // convert each line to a JSON object and return and array of those objects
        let result = [];

        let lines = resp.split(/\n/);
        for (let line of lines) {
            if (line.length < 2) continue; // ignore empty/short lines
            let json;
            try {
                json = JSON.parse(line);
            } catch (e) {
                continue; // ignore invalid JSONS
            }
            // line is ok
            result.push(json);
        }

        return result;

    }


}