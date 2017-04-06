import {Downloader} from "../downloader";
import {Unpacker} from "../unpacker";

export class CCPathLoader {

    private static defaultURL = "https://commoncrawl.s3.amazonaws.com/crawl-data/CC-MAIN-2017-04/wet.paths.gz";

    public static loadPaths(indexURL? : string, callback? : (err? : Error, paths? : Array<string>) => void) {
        Downloader.getResponse(indexURL || CCPathLoader.defaultURL, (err, response) => {
            if (err) {
                callback(err);
            }
            let stream = Unpacker.decompressGZipStream(response);
            let paths : Array<string> = [];
            let remainder = "";
            stream.on('data', (data) => {
                let tmp = data.toString('utf8').split('\n');
                tmp[0] = remainder + tmp[0];
                remainder = tmp.pop();
                paths.push(tmp);
            }).on('end', () => {
                if (callback) { callback(undefined, paths); }
            });
        });
    }
}

