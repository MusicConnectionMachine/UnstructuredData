
// require some stuff
const fs = require('fs');
const path = require('path');
const WARCStream = require('warc');


const dataFolder = './data/';

// read filenames inside the specified folder
fs.readdir(dataFolder, (err, files) => {
    files.forEach(file => {

        // we only want none compressed .wet, .wat or .warc files
        if (path.extname(file).match(/\.wet|\.wat|\.warc/)){

            // open each file in the folder as stream and pipe it to the warc parser
            const WARCParser = new WARCStream();
            fs.createReadStream(dataFolder + file).pipe(WARCParser).on('data', data => {

                // log content of each entry in console
                const content: string = data.content.toString('utf8');
                console.log(content);
            });
        }
    });
});


/*

// Unpacker usage:
import { Unpacker } from "./unpacker";
let unp = new Unpacker();

// gzip example with output filename & callback

let file1 : string = "CC-MAIN-20170116095119-00000-ip-10-171-10-70.ec2.internal.warc.wet.gz";
unp.unpackGZipFileToFile(dataFolder + file1, dataFolder, "result.wet", function() {
    console.log("ready!");
});


// gzip example 2: filename & callback are optional, this will also work:

unp.unpackGZipFileToFile(dataFolder + file3, dataFolder);


// unzip example

let file2 : string = "data.zip";
unp.unpackZipFileToFile(dataFolder + file2, dataFolder);
*/