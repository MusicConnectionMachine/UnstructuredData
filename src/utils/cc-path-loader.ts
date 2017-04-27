import {Downloader} from "./downloader";
import {Unpacker} from "./unpacker";

export class CCPathLoader {

    private static defaultURL = "https://commoncrawl.s3.amazonaws.com/crawl-data/CC-MAIN-2017-04/wet.paths.gz";
    private indexURL : string;


    constructor (crawlVersion: string) {
        this.indexURL = "https://commoncrawl.s3.amazonaws.com/crawl-data/" + crawlVersion + "/wet.paths.gz";
    }

    public loadPaths(callback? : (err? : Error, paths? : Array<string>) => void) {
        CCPathLoader.loadPaths(this.indexURL, callback);
    }

    public static loadPaths(indexURL? : string, callback? : (err? : Error, paths? : Array<string>) => void) {
        Downloader.getResponse(indexURL || CCPathLoader.defaultURL, (err, response) => {
            if (err) {
                callback(err);
                return;
            }
            let stream = Unpacker.decompressGZipStream(response);
            let paths : Array<string> = [];
            let remainder = "";
            stream.on('data', (data) => {
                let tmp = data.toString('utf8').split('\n');
                tmp[0] = remainder + tmp[0];
                remainder = tmp.pop();
                paths = paths.concat(tmp);
            }).on('end', () => {
                if (callback) { callback(undefined, paths); }
            });
        });
    }
}
