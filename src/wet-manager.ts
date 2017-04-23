import {Unpacker} from "./unpacker";
import ReadableStream = NodeJS.ReadableStream;
import {Downloader} from "./downloader";
import {winston} from "./utils/logging";

/**
 * This class manages all WET files. It allows for opening WET files as a stream of unpacked
 * data. When opening a file for the first time it will download the file, store the compressed file on
 * the disk and simultaneously return a stream of uncompressed data.
 * After having opened a file once it will load the file from the file system for future uses.
 */
export class WetManager {

    static fs = require('fs');
    static url = require('url');
    static path = require('path');
    static http = require('http');
    static https = require('https');

    private static wetFolder = './wet/';
    private static basePath = 'https://commoncrawl.s3.amazonaws.com/';

    /**
     * Load the WET file as a stream. filename should be the name of the WET file as it appears
     * on http://index.commoncrawl.org/.
     * @param filename      path to the WET file, without domain
     * @param callback      function that takes a ReadableStream parameter. This is a stream of a unpacked WET file
     * @param useCaching    optional parameter, specifies if caching should be used. Default value is true
     */
    public static loadWetAsStream(filename : string, callback : (err? : Error, resp? : ReadableStream) => void,
        useCaching : boolean = true) : void {
        //URL address of file on server, path.join did weird things
        let url = WetManager.basePath + filename; //WetManager.path.join(WetManager.basePath, filename);
        if (useCaching) {
            WetManager.openWithCaching(url, callback);
        } else {
            WetManager.openWithoutCaching(url, callback);
        }
    };

    private static openWithoutCaching(url : string, callback : (err? : Error, resp? : ReadableStream) => void) : void {
        Downloader.getResponse(url, function (err, resp) {
            if (err) {
                callback(err);
                return;
            }
            let decompressed = Unpacker.decompressGZipStream(resp);
            decompressed.on('error', err => {
                winston.error(err);
            });
            callback(null, decompressed);
        });
    }

    private static openWithCaching(url : string, callback : (err? : Error, resp? : ReadableStream) => void) : void {
        let parsedUrl = WetManager.url.parse(url);

        let dirArray = WetManager.path.dirname(parsedUrl.path).split('/');
        //Segment, aka subfolder in our wet directory
        let segment;
        if (dirArray.length > 2) {
            segment = dirArray[dirArray.length - 2];
        } else {
            segment = 'unknown';
        }

        //filename in folder
        let localFilename = WetManager.path.basename(parsedUrl.path);
        //complete file path on drive
        let filepath = WetManager.path.join(
            WetManager.path.normalize(WetManager.wetFolder),
            segment,
            localFilename
        );

        WetManager.fs.exists(filepath, function (exists) {
            if (exists) {
                //Read existing file from file system as decompressed stream for callback
                let fileReadStream = WetManager.fs.createReadStream(filepath);
                callback(null, Unpacker.decompressGZipStream(fileReadStream));

            } else {
                let dirPath = WetManager.path.join(
                    WetManager.path.normalize(WetManager.wetFolder),
                    segment
                );

                //Create segment directory if not exists
                if (!WetManager.fs.existsSync(dirPath)) {
                    WetManager.fs.mkdirSync(dirPath);
                }

                //Download file, store compressed on disk and execute callback with decompressed stream
                Downloader.getResponse(url, function (err, resp) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    let outputFile = WetManager.fs.createWriteStream(filepath);
                    resp.pipe(outputFile);
                    let decompressed = Unpacker.decompressGZipStream(resp);
                    decompressed.on('error', err => {
                        winston.error(err);
                        outputFile.close();
                        WetManager.fs.unlinkSync(filepath);
                    }).on('end', () => {
                        outputFile.close();
                    });


                    callback(null, decompressed);
                });
            }
        });
    }
}