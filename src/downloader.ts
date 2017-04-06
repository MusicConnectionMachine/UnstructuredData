import {AlreadyExistsError, UnsupportedProtocolError,RequestTimeoutError} from './utils/errors';
import {IncomingMessage} from "http";


export class Downloader {

    static fs = require('fs');
    static url = require('url');
    static path = require('path');
    static http = require('http');
    static https = require('https');

    // Timeout in ms for requesting from CommonCrawl
    static timeout = 20000; // default timeout: 20 sec, CC index is slow


    /**
     * Download file via https or http
     * @param fileURL               URL to the file
     * @param outDir                path to folder which the file will be downloaded to
     * @param callback              (optional) function that will be called once the file is downloaded
     */
    public static downloadToFile(fileURL : string,
                                 outDir : string,
                                 callback? : (err? : Error, filepath? : string) => void) : void {

        let err : Error;
        let parsedURL = Downloader.url.parse(fileURL);


        // extract filename from url
        const filename = Downloader.path.basename(parsedURL.path);
        const filepath = Downloader.path.join(
            Downloader.path.normalize(outDir),
            filename
        );

        // check if file already exists
        if (Downloader.fs.existsSync(filepath)){
            err = new AlreadyExistsError(filepath + ' already exists');
            if (callback) { callback(err); }
            return;
        }


        Downloader.getResponse(fileURL, (err, resp) => {
            if (err) {
                // download as stream failed
                if (callback) callback(err);
                return;
            }
            // printing out download progress
            let totalLength = resp.headers['content-length'];
            let totalDownloaded = 0;
            resp.on('data', (chunk) => {
                totalDownloaded += chunk.length;
                console.log('Downloaded at ' + ((100 * totalDownloaded) / totalLength).toFixed(2) + ' percent.');
            });
            // receiving response and writing to file
            let outputFile = Downloader.fs.createWriteStream(filepath);
            resp.pipe(outputFile);
            outputFile.on("close", () => {
                if (callback) { callback(undefined, filepath); }
            });

        });
    }

    /**
     * Download file via https or http
     * @param fileURL       URL of the file
     * @param callback      Callback function taking IncomingMessage stream as a parameter
     * @param timeout       (optional) timeout for the request, default timeout will be used if not set
     */
    public static getResponse(fileURL : string,
                              callback? : (err? : Error, resp? : IncomingMessage) => void,
                              timeout? : number) : void {

        let parsedURL = Downloader.url.parse(fileURL);
        timeout = timeout || Downloader.timeout;

        // check if protocol is supported
        if (parsedURL.protocol !== 'https:' && parsedURL.protocol !== 'http:') {
            let err : Error = new UnsupportedProtocolError(parsedURL.protocol + ' unsupported');
            if (callback) { callback(err); }
            return;
        }

        // download file and pipe to stream
        if (parsedURL.protocol === 'https:') {
            const request = Downloader.https.get(fileURL, response => {
                callback(undefined, response);
            });
            request.setTimeout(timeout, () => {
                let err : Error = new RequestTimeoutError('Request for file:'+parsedURL.pathname+' was timed out after '+timeout+' ms');
                callback(err,undefined);
            });
        } else if (parsedURL.protocol === 'http:') {
            const request = Downloader.http.get(fileURL, response => {
                callback(undefined, response);
            });
            request.setTimeout(timeout, () => {
                let err : Error = new RequestTimeoutError('Request for file:'+parsedURL.pathname+' was timed out after '+timeout+' ms');
                callback(err,undefined);
            });
        }
    }
}