import { Downloader } from "./downloader";
import { Unpacker } from "./unpacker";
import { WordPreprocessor } from "./word-preprocessor";
import { LanguageExtractor } from "./language-extractor";

const fs = require('fs');
const path = require('path');
const WARCStream = require('warc');


const crawlBaseUrl = 'https://commoncrawl.s3.amazonaws.com/crawl-data/CC-MAIN-2017-04/segments/1484560279169.4/wet/';
const dataFolder = './data/';
const fileName = 'CC-MAIN-20170116095119-00016-ip-10-171-10-70.ec2.internal.warc.wet.gz';


// create folder or use existing one
try {
    fs.mkdirSync(dataFolder);
} catch(e) {
    if (e.code != 'EEXIST') { throw e; }
}


Downloader.downloadFile(crawlBaseUrl + fileName, dataFolder, (err, filepath) => {

    // downloader is ready
    if (err) {
        console.log(err);
        return;
    } else {
        console.log("downloading complete!");
    }

    // download ok -> unpack
    Unpacker.unpackGZipFileToFile(filepath, dataFolder, undefined, (err, filepath) => {
        if (err) {
            console.log(err);
            return;
        } else {
            console.log("unpacking complete!");
        }

        // Extract english pages
        LanguageExtractor.extractWETPages(filepath, 'eng', (err,filepath) => {
            if (err) {
                console.log(err);
                return;
            } else {
                console.log("English pages extraction complete!");
            }

            // we can start digesting here
            // open file as stream and pipe it to the warc parser
            const WARCParser = new WARCStream();
            fs.createReadStream(filepath).pipe(WARCParser).on('data', data => {

            // log content of each entry in console
            const content: string = data.content.toString('utf8');
            let stems = WordPreprocessor.process(content);
            console.log(stems);
            });
        });
    });
});