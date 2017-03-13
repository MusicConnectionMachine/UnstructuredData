import {AlreadyExistsError, UnsupportedProtocolError} from './utils';
import {WriteStream} from "fs";

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

        let outputFile = Downloader.fs.createWriteStream(filepath);

        Downloader.downloadToStream(fileURL, outputFile, (err) => {
            if (err) {
                // download as stream failed
                if (callback) callback(err);

            } else {
                // file was downloaded, outputFile stream successfully closed
                if (callback) { callback(undefined, filepath); }
            }
        });
    }


    public static downloadToStream(fileURL : string,
                                   outputStream : WriteStream,
                                   callback? : (err? : Error) => void) : void {

        let parsedURL = Downloader.url.parse(fileURL);

        // check if protocol is supported
        if (parsedURL.protocol !== 'https:' && parsedURL.protocol !== 'http:') {
            let err : Error = new UnsupportedProtocolError(parsedURL.protocol + ' unsupported');
            if (callback) { callback(err); }
            return;
        }

        // download file and pipe to stream
        if (parsedURL.protocol === 'https:') {
            Downloader.https.get(fileURL, response => { response.pipe(outputStream); });
        } else if (parsedURL.protocol === 'http:') {
            Downloader.http.get(fileURL, response => { response.pipe(outputStream); });
        }


        outputStream.on("close", function () {
            if (callback) { callback(undefined); }
        });


    }
}