import {WebPage} from "./classes/webpage";
import {Unpacker} from "./utils/unpacker";
import {winston} from "./utils/logging";
import {Occurrence} from "./classes/occurrence";
import * as azure from "azure";
import * as uuid from "uuid/v4";

export class Storer {

    private container;
    private blobService;
    private dbConnectionString : string;
    // this guy has to be initialized with connectToDB()!
    private context;
    //This could be left out but it makes it easier for the other groups to access the blobs if we store them with fqdn
    private blobPrefix : string;

    private blob : {name : string, entries : Array<WebPage>};
    private websites : Array<{id : any, url : string, blobUrl : string, occurrences : Array<Occurrence>}> = [];

    constructor(blobParams : {[param : string] : string }, dbParams : {[param : string] : string}){

        let blobAccount = blobParams["blobAccount"];
        let blobContainer = blobParams["blobContainer"];
        let blobKey = blobParams["blobKey"];

        this.blobService = azure.createBlobService(
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

        this.dbConnectionString = "postgresql://"
            + dbParams["dbUser"] + ":"
            + dbParams["dbPW"] + "@"
            + dbParams["dbHost"] + ":"
            + dbParams["dbPort"] + "/"
            + dbParams["dbName"];
    }


    private connectToDB(callback : (err? : Error) => void) : void {

        //Connect to database using api's index
        require('../api/database').connect(this.dbConnectionString, context => {
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
                winston.error(err);
                setTimeout(() => this.connectToDB(callback), 6000);
            });
        });
    }


    /**
     * Stores the website in the Azure blob and in the DB.
     * This doesn't actually save to the DB and blob storage immediately.
     * It will collect data until you call .flush()
     * @param webPage
     */
    public storeWebsite(webPage : WebPage) : void {
        this.storeWebsiteBlob(webPage).storeWebsiteMetadata(webPage);
    }


    /**
     * This doesn't actually save to the DB immediately. It will collect data until you call .flushDatabase()
     * @param webPage
     */
    private storeWebsiteMetadata(webPage : WebPage) {
        this.websites.push({
            id: uuid(),
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
    private storeWebsiteBlob(webPage : WebPage) {
        if (!this.blob) {
            this.blob = {
                name: uuid(),
                entries: []
            };
        }
        this.blob.entries.push(webPage);
        return this;
    }


    public flush(callback? : (err? : Error) => void, retries? : number) : void {
        this.flushBlob(err => {
            if(err) {
                return callback(err);
            }
            this.flushDatabase(err => {
                if(err) {
                    return callback(err);
                }
                callback();
            }, retries)
        }, retries);
    }


    private flushBlob(callback? : (err? : Error) => void, retries? : number) : void {

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
                if (!err) {
                    this.blob = undefined;
                    if (callback) callback();
                } else if (retries > 0) {
                    setTimeout(() => this.flushBlob(callback, retries - 1), 60000);
                } else {
                    if (callback) callback(err);
                }
            });
        });
    }


    private flushDatabase(callback ? : (err? : Error) => void, retries? : number) : void {

        // lazily load sequelize context
        if (!this.context) {
            this.connectToDB(() => this.flushDatabase(callback, retries));
            return;
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
            return this.context.models.websites.bulkCreate(websiteInserts,
                { transaction: transaction} ).then(() => {

                return this.context.models.contains.bulkCreate(containsInserts, { transaction: transaction });
            })
        }).then(() => {
            this.websites = [];
            if(callback) {
                callback();
            }
        }).catch(err => {
            if (retries > 0) {
                setTimeout(() => this.connectToDB(() => this.flushDatabase(callback, retries - 1)), 60000);
            } else {
                if (callback) callback(err);
            }
        });
    }
}