import {WebPage} from "./classes/webpage";
import {Unpacker} from "./utils/unpacker";
import {winston} from "./utils/logging";
import {Occurrence} from "./classes/occurrence";

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
    private websites : Array<{id : any, url : string, blobUrl : string, occurences : Array<Occurrence>}> = [];

    constructor(blobAccount : string, blobContainer : string, blobKey : string){

        this.blobService = Storer.azure.createBlobService(
            blobAccount,
            blobKey
        );
        this.blobPrefix = 'https://' + blobAccount +
            '.blob.core.windows.net/' + blobContainer + '/';
        this.container = blobContainer;
        this.blobService.createContainerIfNotExists(blobContainer, err => {
            if (err) {
                winston.error(err);
            }
        });
    }



    // config.json can be passed as dbParms, quick and dirty :P
    public connectToDB(dbParams, callback : (err? : Error) => void) : void {
        // TODO: error handling/generation

        let databaseURI = "postgresql://"
            + dbParams.dbUser + ":"
            + dbParams.dbPW + "@"
            + dbParams.dbHost + ":"
            + dbParams.dbPort + "/"
            + dbParams.dbName;


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
        this.websites.push({
            id: Storer.uuid(),
            url: webPage.getURI(),
            blobUrl: blobUrl,
            occurences: webPage.occurrences
        });

        if(callback) {
            callback();
        }
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
                    return callback(err);
                }
            });
        });

        this.blob = undefined;
    }

    public flushDatabase(callback ? : (err? : Error) => void) : void {
        const websiteInserts = [];
        const containsInserts = [];
        this.websites.forEach(website => {
            let websiteId = Storer.uuid();
            websiteInserts.push({
                id: websiteId,
                url: website.url,
                blob_url: website.blobUrl
            });
            website.occurences.forEach(occ => {
                containsInserts.push({
                    occurrences: JSON.stringify({
                        term: occ.term.value,
                        positions: occ.positions
                    }),
                    websiteId: websiteId,
                    entityId: occ.term.entityId
                });
            });
        });

        this.context.sequelize.transaction(transaction => {
            return this.context.models.websites.bulkCreate(websiteInserts,
                { transaction: transaction} ).then(() => {

                return this.context.models.contains.bulkCreate(containsInserts, { transaction: transaction });
            })
        }).then(result => {
            this.websites = [];
            if(callback) {
                callback();
            }
        }).catch(err => {
            this.websites = [];
            if(callback) {
                callback(err);
            }
        });
    }
}