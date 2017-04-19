import {WebPage} from "./utils/webpage";
import {Unpacker} from "./unpacker";
export class Storer {

    static azure = require('azure');
    static crypto = require('crypto');
    static path = require('path');

    private container;
    private blobService;
    // this guy has to be initialized with connectToDB()!
    private context;
    //This could be left out but it makes it easier for the other groups to access the blobs if we store them with fqdn
    private blobPrefix : string;

    constructor(blobAccount : string, blobContainer : string, blobKey : string){

        this.blobService = Storer.azure.createBlobService(
            blobAccount,
            blobKey
        );
        this.blobPrefix = 'https://' + blobAccount +
            '.blob.core.windows.net/' + blobContainer + '/';
        this.container = blobContainer;
        this.blobService.createContainerIfNotExists(blobContainer, err => {
            console.log(err);
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
        console.log(webPage.getURI());
        let websiteObj = {
            url: webPage.getURI(),
            blob_url: blobUrl
        };

        if (!this.context) {
            console.error("DB connection is not established! Use connectToDB() after init!");
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
     * @param webPage       WebPage object to be stored
     * @param callback      Optional callback param that will receive the filename as a parameter in case of success
     */
    public storeWebsiteBlob(webPage : WebPage, callback? : (err? : Error, blobName? : string) => void) : void {
        let blobName = Storer.hashWebsite(webPage);
        let blobContent = webPage.toWARCString();

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

    private static hashWebsite(webPage : WebPage) : string {
        let md5sum = Storer.crypto.createHash('md5');
        return md5sum.update(webPage.getURI() + webPage.content).digest('hex');
    }
}