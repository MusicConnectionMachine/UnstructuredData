import {WebPage} from "./utils/webpage";
import {Unpacker} from "./unpacker";
import {CLI} from "./cli";
export class Storer {

    static azure = require('azure');
    static crypto = require('crypto');
    static path = require('path');

    // not static anymore
    // moved init to constructor, otherwise CLI.parameters are not initialized
    private container;
    private blobService;
    private context;
    //This could be left out but it makes it easier for the other groups to access the blobs if we store them with fqdn
    private blobPrefix : string;

    // will be set to true, when the connection is fine
    private dbConnectionEstablished = false;

    constructor(){
        // @Felix: you might want to change this -> pass everything as parameters to this function
        let databaseURI = "postgresql://"
            + CLI.parameters.dbUser + ":"
            + CLI.parameters.dbPW + "@"
            + CLI.parameters.dbHost + ":"
            + CLI.parameters.dbPort + "/mcm";

        //Connect to database using api's index
        require('../api/database').connect(databaseURI, context => {
            //Store context
            this.context = context;

            if (!this.context) {
                console.error("Storer: invalid context (constructor)!");
            }
            /*
             @Lukas THIS DOESN'T WORK!

             Make sure that syncing to database is synchronous.
             Not that there is no {force: true} option here: We don't want to overwrite
             existing tables.
             */
            context.sequelize.sync().then(() => {
                this.dbConnectionEstablished = true;
                return this; // @Lukas this "return" is not working for the constructor
            });
        });

        this.blobService = Storer.azure.createBlobService(
            CLI.parameters.blobAccount,
            CLI.parameters.blobKey
        );
        this.blobPrefix = 'https://' + CLI.parameters.blobAccount +
            '.blob.core.windows.net/' + CLI.parameters.blobContainer + '/';
        this.container = CLI.parameters.blobContainer
    }

    /**
     * Stores the website in the Azure blob and in the DB.
     * @param webpage
     * @param callback
     */
    public storeWebsite(webpage : WebPage, callback? : (err? : Error) => void ) : void {
        this.storeWebsiteBlob(webpage, (err, blobName) => {
            if(err) {
                if(callback) {
                    callback(err);
                }
                return;
            }
            return this.storeWebsiteMetadata(webpage, this.blobPrefix + blobName, callback); // TODO: why return here? @Lukas
        });
    }


    public storeWebsiteMetadata(webpage : WebPage, blobUrl : string, callback? : (err? : Error) => void) : void{
        console.log(webpage.getURI());
        let websiteObj = {
            url: webpage.getURI(),
            blob_url: blobUrl
        };

        if (!this.context) {
            if (!this.dbConnectionEstablished) {
                console.error("Storer: invalid context! You are trying to access the DB before connection was established! This entry will be lost!");
            } else {
                console.error("Storer: invalid context!");
            }
            return;
        }

        //Create website entry in db
        this.context.models.websites.create(websiteObj).then(website => {

            let containsObjList = [];

            //Collect all the contains entries that should be created (One for each term)
            for(let i = 0; i < webpage.occurrences.length; i++) {
                let occ = webpage.occurrences[i];

                containsObjList.push({
                    occurrences: JSON.stringify({
                        term: occ.term.term,
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
                console.log(err);
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
     * @param webpage       WebPage object to be stored
     * @param callback      Optional callback param that will receive the filename as a parameter in case of success
     */
    public storeWebsiteBlob(webpage : WebPage, callback? : (err? : Error, blobName? : string) => void) : void {
        let blobName = Storer.hashWebsite(webpage);
        let blobContent = webpage.toWARCString();

        Unpacker.compressStringToBuffer(blobContent, (err, compressedBlobContent) => {
            if (err) {
                if (callback) callback(err);
                return;
            }
            this.blobService.createBlockBlobFromText(this.container, blobName, compressedBlobContent, function(err) {
                if(err) {
                    if(callback) callback(err);
                    return;
                }
                if(callback) {
                    callback(null, blobName);
                }
            });

        });


    }

    private static hashWebsite(webpage : WebPage) : string {
        let md5sum = Storer.crypto.createHash('md5');
        return md5sum.update(webpage.getURI() + webpage.content).digest('hex');
    }
}