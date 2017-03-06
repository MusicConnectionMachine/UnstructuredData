import { Downloader } from "./downloader";
import { Unpacker } from "./unpacker";

const fs = require('fs');

const crawlBaseUrl = 'https://commoncrawl.s3.amazonaws.com/crawl-data/CC-MAIN-2017-04/segments/1484560279169.4/wet/';
const dataFolder = './data/';
const fileName = 'CC-MAIN-20170116095119-00016-ip-10-171-10-70.ec2.internal.warc.wet.gz';

// create folder or use existing one
try {
    fs.mkdirSync(dataFolder);
} catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
}

Downloader.downloadFile(crawlBaseUrl + fileName, dataFolder, err => {

    // downloader is ready
    if (err) { console.log(err); }
    else {
        console.log("downloading complete!");

        // download ok -> unpack
        Unpacker.unpackGZipFileToFile(dataFolder + fileName, dataFolder, undefined, err => {
            if (err) { console.log(err); }
            else {
                console.log("unpacking complete!");

                // we can start digesting here

            }
        });
    }
});



/** commented out for now as it's not the main focus right now */
/*
const path = require('path');
const WARCStream = require('warc');
const parser = require('./parser');

// digest web archive file
function digestFile(filepath : string) : void {

    // we only want none compressed .wet, .wat or .warc files
    if (path.extname(filepath).match(/\.wet|\.wat|\.warc/)){

        // open each file in the folder as stream and pipe it to the warc parser
        const WARCParser = new WARCStream();
        fs.createReadStream(filepath).pipe(WARCParser).on('data', data => {

            // log content of each entry in console
            const content: string = data.content.toString('utf8');
            let stems = parser.parse(content);

        });
    }
}
*/
