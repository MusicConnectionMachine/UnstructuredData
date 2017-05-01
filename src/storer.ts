import {WebPage} from "./classes/webpage";
import {Unpacker} from "./utils/unpacker";
import {winston} from "./utils/logging";
import {Occurrence} from "./classes/occurrence";
import * as azure from "azure";
import * as uuid from "uuid/v4";

export class Storer {

    private storageService;
    private blobContainer : string;
    private blobPrefix : string;
    private jsonContainer : string;

    private saveMetadataAsJSON : boolean;

    private context;
    private connectToDB : (callback : (err? : Error) => void, retries? : number) => void = (callback) => {
        callback(new TypeError("method not defined"));
    };

    private blob : {name : string, content : string} = {name: uuid(), content: ""};
    private websites : Array<{url : string, blobUrl : string, occurrences : Array<Occurrence>}> = [];

    /**
     * This object is responsible for saving web page content and metadata. Content will be stored in the
     * supplied Azure blob storage container. Metadata will be saved in a separate storage container or in
     * a Postgres DB if dbParams are supplied
     * @param blobParams                                    details of Azure storage account and containers
     * @param dbParams                                      (optional) credentials for Postgres DB
     */
    constructor(blobParams : { blobAccount : string, blobKey : string, blobContainer : string, jsonContainer : string },
                dbParams? : { dbUser : string, dbPW : string, dbHost : string, dbPort : string, dbName : string }){

        let blobAccount = blobParams.blobAccount;
        let blobKey = blobParams.blobKey;
        this.blobContainer = blobParams.blobContainer;
        this.jsonContainer = blobParams.jsonContainer;

        this.storageService = azure.createBlobService(
            blobAccount,
            blobKey
        );
        this.blobPrefix = 'https://' + blobAccount + '.blob.core.windows.net/' + this.blobContainer + '/';

        if (dbParams) {
            this.connectToDB = (callback : (err? : Error) => void, retries? : number) => {
                let dbConnectionString = "postgresql://"
                    + dbParams.dbUser + ":"
                    + dbParams.dbPW + "@"
                    + dbParams.dbHost + ":"
                    + dbParams.dbPort + "/"
                    + dbParams.dbName;

                //Connect to database using api's index
                require('../api/database').connect(dbConnectionString, context => {
                    //Store context
                    this.context = context;
                    /*
                     Make sure that syncing to database is synchronous.
                     Not that there is no {force: true} option here: We don't want to overwrite
                     existing tables.
                     */
                    context.sequelize.sync().then(() => {
                        winston.info("Connection to DB established!");
                        callback();
                    }, (err) => {
                        if (retries > 0) {
                            winston.error("Failed to connect to DB. Retrying in 60 seconds!", err);
                            setTimeout(() => this.connectToDB(callback, retries - 1), 6000);
                        } else {
                            winston.error("Finally failed to connect to DB. Calling Callback!", err);
                            callback(err);
                        }
                    });
                });
            };
        } else {
            this.saveMetadataAsJSON = true;
        }
    }


    /**
     * Stores the website in the Azure blob and in the DB.
     * This doesn't actually save to the DB and blob storage immediately.
     * It will collect data until you call .flush()
     * @param webPage
     */
    public storeWebsite(webPage : WebPage) : Storer {
        return this.storeWebsiteBlob(webPage).storeWebsiteMetadata(webPage);
    }


    /**
     * This doesn't actually save to the DB immediately. It will collect data until you call .flushDatabase()
     * @param webPage
     */
    private storeWebsiteMetadata(webPage : WebPage) : Storer {
        this.websites.push({
            url: webPage.getURI(),
            blobUrl: this.blob ? this.blobPrefix + this.blob.name : null,
            occurrences: webPage.occurrences
        });
        return this;
    }

    /**
     * This doesn't actually save to the blob storage immediately. It will collect data until you call .flushBlob()
     * Use "storeWebsite()" if you want to store the website in the blob and the DB.
     * This function is only for Azure.
     *
     * Stores given website as a blob in the azure blob storage. The filename will be an UUID
     *
     * @param webPage       WebPage object to be stored
     */
    private storeWebsiteBlob(webPage : WebPage) : Storer {
        this.blob.content += webPage.toWARCString();
        return this;
    }

    public flush(callback? : (err? : Error) => void, retries? : number, saveMetaDataAsJSON? : boolean) : void {
        this.flushBlob(err => {
            if(err) {
                return callback(err);
            }
            if (this.saveMetadataAsJSON || saveMetaDataAsJSON) {
                this.flushMetadataJSON(err => {
                    if(err) {
                        return callback(err);
                    }
                    callback();
                }, retries)
            } else {
                this.flushMetadataDB(err => {
                    if(err) {
                        return callback(err);
                    }
                    callback();
                }, retries)
            }
        }, retries);
    }


    public flushBlob(callback? : (err? : Error) => void, retries? : number) : void {

        let blobName = this.blob.name;
        Unpacker.compressStringToBuffer(this.blob.content, (err, compressedBlobContent) => {
            if (err) {
                if (callback) callback(err);
                return;
            }
            this.storageService.createBlockBlobFromText(this.blobContainer, blobName, compressedBlobContent, (err) => {
                if (!err) {
                    winston.info("Successfully offloaded blob!");
                    this.blob = {name: uuid(), content: ""};
                    if (callback) callback();
                } else if (retries > 0) {
                    winston.error("Failed to offload blob! Retrying in 60 seconds!", err);
                    setTimeout(() => this.flushBlob(callback, retries - 1), 60000);
                } else {
                    winston.error("Finally failed to offload blob! Calling callback!", err);
                    if (callback) callback(err);
                }
            });
        });
    }


    public flushMetadataJSON(callback ? : (err? : Error) => void, retries? : number) : void {
        let blobName = uuid() + ".json";
        let blobContent = JSON.stringify(this.websites);
        this.storageService.createBlockBlobFromText(this.jsonContainer, blobName, blobContent, (err) => {
            if (!err) {
                this.websites = [];
                winston.info("Successfully offloaded metadata blob!");
                if (callback) callback();
            } else if (retries > 0) {
                winston.error("Failed to offload metadata blob! Retrying in 60 seconds!", err);
                setTimeout(() => this.flushMetadataJSON(callback, retries - 1), 60000);
            } else {
                winston.error("Finally failed to offload metadata blob! Calling callback!", err);
                if (callback) callback(err);
            }
        });
    }

    public flushMetadataDB(callback ? : (err? : Error) => void, retries? : number) : void {

        // lazily load sequelize context
        if (!this.context) {
            return this.connectToDB((err) => {
                if (!err) {
                    this.flushMetadataDB(callback, retries);
                } else if (callback) {
                    callback(err);
                }
            }, 60);
        }

        const websiteInserts = [];
        const containsInserts = [];
        this.websites.forEach(website => {
            let websiteId = uuid();
            websiteInserts.push({
                id: websiteId,
                url: website.url,
                blob_url: website.blobUrl
            });
            website.occurrences.forEach(occ => {
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
            return this.context.models.websites.bulkCreate(websiteInserts, {transaction: transaction}).then(() => {
                return this.context.models.contains.bulkCreate(containsInserts, {transaction: transaction});
            });
        }).then(() => {
            winston.info("Successfully offloaded data to DB!");
            this.websites = [];
            if(callback) {
                callback();
            }
        }).catch(err => {
            if (retries > 0) {
                winston.error("Failed to offload data to DB! Retrying in 60 seconds!", err);
                setTimeout(() => this.connectToDB(() => this.flushMetadataDB(callback, retries - 1)), 60000);
            } else {
                winston.error("Finally failed to offload data to DB! Calling callback!", err);
                if (callback) callback(err);
            }
        });
    }
}