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
        //Connect to database using api's index
        require('../api/database').connect(null, context => {
            //Store context
            this.context = context;
            /*
             Make sure that syncing to database is synchronous.
             Not that there is no {force: true} option here: We don't want to overwrite
             existing tables.
             */
            context.sequelize.sync().then(() => {return this;});
        });
    }

    public storeWebsite(webpage : WebPage, callback? : (err? : Error) => void ) : void {
        this.storeWebsiteBlob(webpage, (err, blobName) => {
            if(err) {
                if(callback) {
                    callback(err);
                }
                return;
            }
            return this.storeWebsiteMetadata(webpage, Storer.blobPrefix + blobName, callback);
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

            let containsObjList = [];

            //Collect all the contains entries that should be created (One for each term)
            for(let i = 0; i < webpage.occurrences.length; i++) {
                let occ = webpage.occurrences[i];
                containsObjList.push({
                    occurences: JSON.stringify({
                        term: occ.term.term,
                        positions: occ.positions
                    }),
                    websiteId: website.get('id'),
                    entityId: occ.term.entityId
                })
            }

            //Create all contains entries at once
            this.context.bulkCreate(containsObjList).then(result => {
                callback(null);
            }).catch(err => {
                //Make sure we don't leave that website hanging
                return website.destroy();
            });

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