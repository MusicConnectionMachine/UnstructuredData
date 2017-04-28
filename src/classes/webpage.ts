import {Occurrence} from "./occurrence";


export class WebPage {

    private static url = require('url');
    private static path = require('path');

    public protocol : string;
    public headers : {[header : string] : string};
    public content : string;
    public occurrences : Array<Occurrence>;

    constructor(WARCData? : {protocol : string, headers : {[header : string] : string}, content : Buffer}) {
        this.occurrences = [];
        if (WARCData) {
            this.protocol = WARCData.protocol;
            this.headers = WARCData.headers;
            this.content = WARCData.content.toString('utf8');
        }
    }


    /**
     * Returns true if this objects represent a web page. The WARC-Type must equal "conversion".
     * @returns {boolean} true if the WARC-Type equals "conversion"
     */
    public isWebPage() : boolean {
        let type : string = this.headers['WARC-Type'];
        return !(!type || (type != "conversion"));
    }

    /**
     * Returns the URI of this web page or "URI-NOT-FOUND".
     * @returns {string}
     */
    public getURI() : string {
        let trgURI : string = this.headers['WARC-Target-URI'];
        if (!trgURI) return "";
        return trgURI;
    }

    /**
     * Returns the top level domain (TLD) of this web page or empty string otherwise.
     *
     * @returns {string}
     */
    public getTLD() : string {
        let trgURI : string = this.getURI();

        // parse URI and get hostname e.g. "host.com" or "127.0.0.1"
        let hostname = WebPage.url.parse(trgURI).hostname;

        if (hostname !== null) {

            // check if hostname is IPv4 address, otherwise path will get confused
            // source: http://stackoverflow.com/questions/4460586/javascript-regular-expression-to-check-for-ip-addresses/26445549#26445549
            if (/^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/.test(hostname)) { return ""; }

            // treat hostname as a filename, the extension name will be the TLD
            let tld = WebPage.path.extname(hostname);
            return tld.substring(1);    // remove dot
        }
    }

    /**
     * Converts this web page back to its WARC representation.
     * @returns {string}    protocol \n properties \n\n content
     */
    public toWARCString() : string {
        // protocol
        let str : string = this.protocol + '\n';
        // properties
        for (let property in this.headers) {
            str += property + ': ' + this.headers[property] + '\n';
        }
        // content
        str += '\n' + this.content + '\n\n';
        return str;
    }

    /**
     * Deeply merges two array of Occurrences into this.occurrences
     * @param occurrences
     */
    public mergeOccurrences(occurrences : Array<Occurrence>) : void {

        // check for trivial cases
        if (occurrences.length === 0) {
            return;
        }
        if (this.occurrences.length === 0) {
            this.occurrences = occurrences;
            return;
        }

        // convert one of the arrays into Map (term -> [id, positions])
        let mergedMap : Map<string, [string, Array<number>]> = Occurrence.occArrayToMap(this.occurrences);

        // add new occurrences one by one to the map
        for (let occurrence of occurrences) {

            let termStr = occurrence.term.value;

            // check if term is already present in map
            if (mergedMap.has(termStr)) {
                // merge indexes
                let [id, pos] = mergedMap.get(termStr);
                let mergedIndexes = new Set(pos);
                for (let index of occurrence.positions) {
                    mergedIndexes.add(index);
                }
                mergedMap.set(termStr, [id, Array.from(mergedIndexes)]);
            } else {
                mergedMap.set(termStr, [occurrence.term.entityId, occurrence.positions]);
            }

        }

        // convert map back to an array of Occurrences
        this.occurrences = Occurrence.occMapToArr(mergedMap);
    }

    /**
     * Shrinks down the content of a page until all lines have the average length
     * @param threshold                             threshold for average line length
     * @return {WebPage}
     */
    public shrinkContent(threshold : number) {
        let split = this.content.split("\n");

        // save line numbers and text
        let lines : Array<Object> = [];
        for (let entry of split.entries()) {
            lines.push(entry);
        }

        // sort by line length
        lines.sort((a, b) => {
            if (a[1].length > b[1].length) return -1;
            if (a[1].length < b[1].length) return 1;
            return 0;
        });

        // remove shortest lines until threshold is reached
        let textLength = this.content.length;
        while(lines.length > 0 && textLength / lines.length < threshold) {
            let shortestLength = lines[lines.length - 1][1].length;
            while (shortestLength === lines[lines.length - 1][1].length) {
                textLength -= lines.pop()[1].length;
            }
        }

        // sort by original index
        lines.sort((a , b) => {
            if (a[0] > b[0]) return 1;
            if (a[0] < b[0]) return -1;
            return 0;
        });

        // reassemble string
        let result = "";
        if (lines.length > 0) {
            result += lines[0][1];
            for (let i = 1; i < lines.length; i++){
                result += "\n" + lines[i][1];
            }
        }

        this.content = result;
        return this;
    }
}