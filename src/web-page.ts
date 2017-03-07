export class WebPage {

    public protocol : string;
    public headers : object;
    public content : string;
    // more coming

    constructor(warcData : any) {
        this.protocol = warcData.protocol;
        this.headers = warcData.headers;
        this.content = warcData.content.toString('utf8');
    }






}