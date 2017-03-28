import {WebPage} from "./web-page";
export class Storer {

    static azure = require('azure');
    static crypto = require('crypto');
    static config = require('../config.json');

    static blobService = Storer.azure.createBlobService(Storer.config.storageAccountname,
        Storer.config.storageKey);

    static container = Storer.config.container;

    public static storeWebsite(webpage : WebPage) : void {
        Storer.storeWebsiteBlob(webpage);

        //TODO: Create database entry for website
    }

    /**
     * Stores given website as a blob in the azure blob storage. The filename will be an md5 hash
     * of website uri + content
     * @param webpage       WebPage object to be stored
     * @param callback      Optional callback param that will receive the filename as a parameter in case of success
     */
    private static storeWebsiteBlob(webpage : WebPage, callback? : (err? : Error, blobName? : string) => void) : void {
        let blobName = Storer.hashWebsite(webpage);
        let blobContent = '';
        for (let property in webpage.headers) {
            if (webpage.headers.hasOwnProperty(property)) {
                blobContent += property + ": " + webpage.headers[property] + '\n';
            }
        }
        blobContent += webpage.content
        console.log('blobName: ' + blobName);
        console.log('blobContent: ' + blobContent);
        Storer.blobService.createBlockBlobFromText(Storer.container, blobName, blobContent, function(err, result) {
            if(err) {
                if(callback) {
                    callback(err);
                }
                return;
            }
            if(callback) {
                callback(null, blobName);
            }
        });
    }

    private static hashWebsite(webpage : WebPage) : string {
        let md5sum = Storer.crypto.createHash('md5');
        return md5sum.update(webpage.getURI() + webpage.content).digest('hex');
    }
}