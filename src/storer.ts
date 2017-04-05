import {WebPage} from "./utils/webpage";
export class Storer {

    static azure = require('azure');
    static crypto = require('crypto');
    static config = require('../config.json');
    static path = require('path');

    static blobService = Storer.azure.createBlobService(Storer.config.storageAccountname,
        Storer.config.storageKey);

    static container = Storer.config.container;

    private context;

    constructor(){
        let me = this;
        //Connect to database using api's index
        require('../api/database').connect(function(context) {
            //Load websites module
            me.context = context;
            /*
             Make sure that syncing to database is synchronous.
             Not that there is no {force: true} option here: We don't want to overwrite
             existing tables.
             */
            context.sequelize.sync().then(() => {return me;});
        });
    }

    public storeWebsite(webpage : WebPage, callback? : (err? : Error) => void ) : void {
        let me = this;
        this.storeWebsiteBlob(webpage, function(err, blobName) {
            if(err) {
                if(callback) {
                    callback(err);
                }
                return;
            }
            return me.storeWebsiteMetadata(webpage, blobName, callback);
        });
    }


    public storeWebsiteMetadata(webpage : WebPage, blobUrl : string, callback? : (err? : Error) => void) : void{
        let websiteObj = {
            url: webpage.getURI(),
            blob_url: blobUrl
        };

        this.context.websites.create(websiteObj).then(website => {
            let containsObj = {
                occurences: JSON.stringify(webpage.occurrences),
                websitesId: website.get('id')
            };

            this.context.contains.create(containsObj).then(() => {
                callback(null);
            }).catch(err => {
                return website.destroy();
            }).then(() => {
                callback({
                    name: 'db error',
                    message: 'contains entry could not be created'
                });
            })
        }).catch(err => {
            return callback(err);
        });
    }

    /**
     * Stores given website as a blob in the azure blob storage. The filename will be an md5 hash
     * of website uri + content
     * @param webpage       WebPage object to be stored
     * @param callback      Optional callback param that will receive the filename as a parameter in case of success
     */
    private storeWebsiteBlob(webpage : WebPage, callback? : (err? : Error, blobName? : string) => void) : void {
        let blobName = Storer.hashWebsite(webpage);
        let blobContent = '';
        for (let property in webpage.headers) {
            if (webpage.headers.hasOwnProperty(property)) {
                blobContent += property + ": " + webpage.headers[property] + '\n';
            }
        }
        blobContent += webpage.content;
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