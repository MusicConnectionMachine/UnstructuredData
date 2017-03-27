import {WebPage} from "./web-page";
/**
 * Created by lukas on 3/27/17.
 */
export class Storer {

    static azure = require('azure');
    static crypto = require('crypto');

    static blobService = Storer.azure.createBlobService('wetstorage',
        'x7P3BHTnMpY+JB2dAHnzkaHVoz080IUSthfYDhTPFtYWNzIuwn70szGE+vIHn5S4BPad6gioTdlLafxkpszGHQ==');

    static container = 'websites';

    public static storeWebsite(webpage : WebPage) : void {
        Storer.storeWebsiteBlob(webpage);

        //TODO: Create database entry for website
    }

    private static storeWebsiteBlob(webpage : WebPage, ) : void {
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
                console.log(err);
                return;
            }
            console.log(result);
        });
    }

    private static hashWebsite(webpage : WebPage) : string {
        let md5sum = Storer.crypto.createHash('md5');
        return md5sum.update(webpage.getURI() + webpage.content).digest('hex');
    }
}