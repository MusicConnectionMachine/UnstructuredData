// require some stuff
var fs = require('fs');
var https = require('https');
var path = require('path');
var WARCStream = require('warc');

var parser = require('./parser');
// download web archive file
function downloadFile(fileURL, directory) {
    // create new directory
    try {
        fs.mkdirSync(directory);
    }
    catch (e) {
        // catch exception if directory already exists
        if (e.code != 'EEXIST')
            throw e;
    }
    // extract filename from url
    var filename = path.basename(fileURL);
    // check if file already exists
    if (!fs.exists(directory + filename)) {
        // create a new file on disk
        var file_1 = fs.createWriteStream(directory + filename);
        // download file
        https.get(fileURL, function (response) { response.pipe(file_1); });
    }
}
// digest web archive file
function digestFile(filepath) {
    // we only want none compressed .wet, .wat or .warc files
    if (path.extname(filepath).match(/\.wet|\.wat|\.warc/)) {
        // open each file in the folder as stream and pipe it to the warc parser
        var WARCParser = new WARCStream();
        fs.createReadStream(filepath).pipe(WARCParser).on('data', function (data) {
            // log content of each entry in console
            var content = data.content.toString('utf8');
            var stems = parser.parse(content);
        });
    }
}
var crawlUrl = 'https://commoncrawl.s3.amazonaws.com/crawl-data/CC-MAIN-2017-04/segments/1484560279169.4/wet/CC-MAIN-20170116095119-00016-ip-10-171-10-70.ec2.internal.warc.wet.gz';
downloadFile(crawlUrl, './data/');

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
