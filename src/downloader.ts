export class Downloader {

    fs = require('fs');
    url = require('url');
    path = require('path');
    http = require('http');
    https = require('https');


    /**
     * Download file via https or http
     * @param fileURL               URL to the file
     * @param outDir                path to folder which the file will be downloaded to
     * @param callback              (optional) function that will be called once the file is downloaded
     */
    public downloadFile(fileURL : string, outDir : string, callback : (err : Error) => void) : void {

        let err : Error;
        let parsedURL = this.url.parse(fileURL);

        // extract filename from url
        const filename = this.path.basename(parsedURL.path);
        const filepath = this.path.join(outDir, filename);

        // check if file already exists
        if (this.fs.existsSync(filepath)){
            err = new AlreadyExistsError(filepath + ' already exists');
            if (callback) { callback(err); }
        } else {
            let outputFile = this.fs.createWriteStream(filepath);

            // download file
            if (parsedURL.protocol === 'https:') {
                this.https.get(fileURL, response => { response.pipe(outputFile); });
            } else if (parsedURL.protocol === 'http:') {
                this.http.get(fileURL, response => { response.pipe(outputFile); });
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