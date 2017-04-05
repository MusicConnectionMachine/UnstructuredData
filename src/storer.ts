import {WebPage} from "./utils/webpage";
export class Storer {

    static azure = require('azure');
    static crypto = require('crypto');
    static config = require('../config.json');
    static path = require('path');
    //This could be left out but it makes it easier for the other groups to access the blobs if we store them with fqdn
    static blobPrefix = 'https://wetstorage.blob.core.windows.net/websites/';

    static blobService = Storer.azure.createBlobService(Storer.config.storageAccountname,
        Storer.config.storageKey);

    static container = Storer.config.container;

    private context;

    constructor(){
        let me = this;
        //Connect to database using api's index
        require('../api/database').connect(null, function(context) {
            //Store context
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
            return me.storeWebsiteMetadata(webpage, Storer.blobPrefix + blobName, callback);
        });
    }


    public storeWebsiteMetadata(webpage : WebPage, blobUrl : string, callback? : (err? : Error) => void) : void{
        console.log(webpage.getURI());
        let websiteObj = {
            url: webpage.getURI(),
            blob_url: blobUrl
        };

        //Create website entry in db
        this.context.models.websites.create(websiteObj).then(website => {
            let containsObj = {
                occurrences: JSON.stringify(webpage.occurrences),
                websiteId: website.get('id')
            };

            //Create contains entry in db
            this.context.models.contains.create(containsObj).then(() => {
                if(callback) {
                    callback(null);
                }
            }).catch(err => {
                //Make sure we don't have a website with no occurences object
                return website.destroy();
            }).then(() => {
                //Return error after destroying website
                if(callback) {
                    callback({
                        name: 'db error',
                        message: 'contains entry could not be created'
                    });
                }
            })
        }).catch(err => {
            if(callback) {
                callback(err);
            }
            return;
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