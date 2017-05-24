import {UnsupportedProtocolError,RequestTimeoutError} from '../classes/errors';
import {IncomingMessage} from "http";
import * as url from "url";
import * as http from "http";
import * as https from "https";

export class Downloader {

    // Timeout in ms for requesting from CommonCrawl
    static timeout = 20000; // default timeout: 20 sec, CC index is slow

    /**
     * Download file via https or http
     * @param fileURL       URL of the file
     * @param callback      Callback function taking IncomingMessage stream as a parameter
     * @param timeout       (optional) timeout for the request, default timeout will be used if not set
     */
    public static getResponse(fileURL : string,
                              callback? : (err? : Error, resp? : IncomingMessage) => void,
                              timeout? : number) : void {

        let parsedURL = url.parse(fileURL);
        timeout = timeout || Downloader.timeout;

        // check if protocol is supported
        if (parsedURL.protocol !== 'https:' && parsedURL.protocol !== 'http:') {
            let err : Error = new UnsupportedProtocolError(parsedURL.protocol + ' unsupported');
            if (callback) { callback(err); }
            return;
        }

        // sends a get request using the specified module (http or https)
        function getUsing(module) {
            const request = module.get(fileURL, response => {
                callback(undefined, response);
            });
            request.setTimeout(timeout, () => {
                request.abort();
                let err : Error = new RequestTimeoutError('Request for file:'+parsedURL.pathname+' was timed out after '+timeout+' ms');
                callback(err,undefined);
            });
            request.on('error', function(err) {
                callback(err,undefined);
            });
        }

        // download file and pipe to stream
        if (parsedURL.protocol === 'https:') {
            getUsing(https);
        } else if (parsedURL.protocol === 'http:') {
            getUsing(http);
        }
    }
}