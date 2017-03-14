export class WebPage {

    public protocol : string;
    public headers : object;
    public content : string;
    public match : string; //temporary, remove once we have a better algorithm
    // more coming

    constructor(warcData : any) {
        this.protocol = warcData.protocol;
        this.headers = warcData.headers;
        this.content = warcData.content.toString('utf8');
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
        if (!trgURI) return "URI-NOT-FOUND";
        return trgURI;
    }

    /**
     * Returns the top level domain (TLD) of this web page or "TLD-NOT-FOUND".
     * Could break if the host is a raw IPv6 address (IPv4 is OK).
     *
     * @returns {string}
     */
    public getTLD() : string {

        let trgURI : string = this.getURI();
        // remove protocol
        trgURI = trgURI.replace("http://", "").replace("https://", "");
        // remove path
        trgURI = trgURI.split("/", 2)[0];

        // host is a raw IP address -> no TLD
        if (/^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/.test(trgURI)) {
            // regex taken from http://stackoverflow.com/questions/4460586/javascript-regular-expression-to-check-for-ip-addresses
            return "TLD-NOT-FOUND";
        }

        // split host & return the last part = TLD
        let hostParts = trgURI.split(".");
        return hostParts[hostParts.length - 1];
    }


}