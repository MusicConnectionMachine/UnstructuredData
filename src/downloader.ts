export class Downloader {

    static fs = require('fs');
    static url = require('url');
    static path = require('path');
    static http = require('http');
    static https = require('https');


    /**
     * Download file via https or http
     * @param fileURL               URL to the file
     * @param outDir                path to folder which the file will be downloaded to
     * @param callback              (optional) function that will be called once the file is downloaded
     */
    public static downloadFile(fileURL : string, outDir : string, callback? : (err : Error) => void) : void {

        let err : Error;
        let parsedURL = Downloader.url.parse(fileURL);

        // extract filename from url
        const filename = Downloader.path.basename(parsedURL.path);
        const filepath = Downloader.path.join(outDir, filename);

        // check if file already exists
        if (Downloader.fs.existsSync(filepath)){
            err = new AlreadyExistsError(filepath + ' already exists');
            if (callback) { callback(err); }
        } else {
            let outputFile = Downloader.fs.createWriteStream(filepath);

            // download file
            if (parsedURL.protocol === 'https:') {
                Downloader.https.get(fileURL, response => { response.pipe(outputFile); });
            } else if (parsedURL.protocol === 'http:') {
                Downloader.http.get(fileURL, response => { response.pipe(outputFile); });
            } else {
                err = new UnsupportedProtocolError(parsedURL.protocol + ' unsupported');
            }

            outputFile.on("close", function () {
                if (callback) { callback(err); }
            });
        }
    }
}

function UnsupportedProtocolError(message : string) {
    this.name = 'UnsupportedProtocolError';
    this.message = (message || '');
}
UnsupportedProtocolError.prototype = Error.prototype;

function AlreadyExistsError(message : string) {
    this.name = 'AlreadyExistsError';
    this.message = (message || '');
}
AlreadyExistsError.prototype = Error.prototype;