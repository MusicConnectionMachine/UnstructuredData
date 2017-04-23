import {WebPage} from "./utils/webpage";
import {Unpacker} from "./unpacker";
import {winston} from "./utils/logging";

export class Storer {

    static azure = require('azure');
    static crypto = require('crypto');
    static path = require('path');
    static uuid = require('uuid/v4');

    private container;
    private blobService;
    // this guy has to be initialized with connectToDB()!
    private context;
    //This could be left out but it makes it easier for the other groups to access the blobs if we store them with fqdn
    private blobPrefix : string;

    private blob : {name : string, entries : Array<WebPage>};

    constructor(blobAccount : string, blobContainer : string, blobKey : string){

        this.blobService = Storer.azure.createBlobService(
            blobAccount,
            blobKey
        );
        this.blobPrefix = 'https://' + blobAccount +
            '.blob.core.windows.net/' + blobContainer + '/';
        this.container = blobContainer;
        this.blobService.createContainerIfNotExists(blobContainer, err => {
            winston.error(err);
        });
    }



    // config.json can be passed as dbParms, quick and dirty :P
    public connectToDB(dbParms, callback : (err? : Error) => void) : void {
        // TODO: error handling/generation

        let databaseURI = "postgresql://"
            + dbParms.dbUser + ":"
            + dbParms.dbPW + "@"
            + dbParms.dbHost + ":"
            + dbParms.dbPort + "/mcm";


        //Connect to database using api's index
        require('../api/database').connect(databaseURI, context => {
            //Store context
            this.context = context;
            /*
             Make sure that syncing to database is synchronous.
             Not that there is no {force: true} option here: We don't want to overwrite
             existing tables.
             */
            context.sequelize.sync().then(() => {
                callback();
            }, (err) => {
                callback(err);
            });
        });
    }


    /**
     * Stores the website in the Azure blob and in the DB.
     * @param webPage
     * @param callback
     */
    public storeWebsite(webPage : WebPage, callback? : (err? : Error) => void ) : void {
        this.storeWebsiteBlob(webPage, (err, blobName) => {
            if(err) {
                if(callback) {
                    callback(err);
                }
                return;
            }
            return this.storeWebsiteMetadata(webPage, this.blobPrefix + blobName, callback); // TODO: why return here? @Lukas
        });
    }


    public storeWebsiteMetadata(webPage : WebPage, blobUrl : string, callback? : (err? : Error) => void) : void{
        let websiteObj = {
            url: webPage.getURI(),
            blob_url: blobUrl
        };

        if (!this.context) {
            winston.error("DB connection is not established! Use connectToDB() after init!");
            callback(new Error("DB connection is not established!"));
            return;
        }


        //Create website entry in db
        this.context.models.websites.create(websiteObj).then(website => {

            let containsObjList = [];

            //Collect all the contains entries that should be created (One for each term)
            for(let i = 0; i < webPage.occurrences.length; i++) {
                let occ = webPage.occurrences[i];

                containsObjList.push({
                    occurrences: JSON.stringify({
                        term: occ.term.value,
                        positions: occ.positions
                    }),
                    websiteId: website.get('id'),
                    entityId: occ.term.entityId
                })
            }

            //Create all contains entries at once
            this.context.models.contains.bulkCreate(containsObjList).then(() => {
                callback(null);
            }).catch(err => {
                winston.error(err);
                //Make sure we don't leave that website hanging
                return website.destroy();  // TODO: why return here? @Lukas
            });

        }).catch(err => {
            if(callback) {
                callback(err);
            }
            return; // TODO: why return here? @Lukas
        });
    }

    /**
     * Use "storeWebsite()" if you want to store the website in the blob and the DB.
     * This function is only for Azure. Made this public to be able to test it from outside.
     *
     * Stores given website as a blob in the azure blob storage. The filename will be an md5 hash
     * of website uri + content.
     *
     * @param webPage       WebPage object to be stored
     * @param callback      Optional callback param that will receive the filename as a parameter in case of success
     */
    public storeWebsiteBlob(webPage : WebPage, callback? : (err? : Error, blobName? : string) => void) : void {
        if (!this.blob) {
            this.blob = {
                name: Storer.uuid(),
                entries: []
            };
        }
        this.blob.entries.push(webPage);
        callback(undefined, this.blob.name);
    }

    public flushBlob(callback? : (err? : Error) => void) : void {

        let blobContent = "";
        for (let entry of this.blob.entries) {
            blobContent += entry.toWARCString();
        }

        let blobName = this.blob.name;
        Unpacker.compressStringToBuffer(blobContent, (err, compressedBlobContent) => {
            if (err) {
                if (callback) callback(err);
                return;
            }
            this.blobService.createBlockBlobFromText(this.container, blobName, compressedBlobContent, (err) => {
                if(callback) {
                    callback(err);
                }
            });

        });

        this.blob = undefined;
    }
}