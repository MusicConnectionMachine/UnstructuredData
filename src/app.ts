
// require some stuff
const fs = require('fs');
const https = require('https');
const path = require('path');
const WARCStream = require('warc');

const parser = require('./parser');

// download web archive file
function downloadFile(fileURL : string, directory : string) : void {

    // create new directory
    try {
        fs.mkdirSync(directory);
    } catch(e) {

        // catch exception if directory already exists
        if ( e.code != 'EEXIST' ) throw e;
    }

    // extract filename from url
    const filename = path.basename(fileURL);

    // check if file already exists
    if (!fs.exists(directory + filename)){

        // create a new file on disk
        let file = fs.createWriteStream(directory + filename);

        // download file
        https.get(fileURL, response => { response.pipe(file); });
    }
}


// digest web archive file
function digestFile(filepath : string) : void {

    // we only want none compressed .wet, .wat or .warc files
    if (path.extname(filepath).match(/\.wet|\.wat|\.warc/)){

        // open each file in the folder as stream and pipe it to the warc parser
        const WARCParser = new WARCStream();
        fs.createReadStream(filepath).pipe(WARCParser).on('data', data => {

            // log content of each entry in console
            const content: string = data.content.toString('utf8');
            var stems = parser.parse(content);

        });
    }
}

const crawlUrl = 'https://commoncrawl.s3.amazonaws.com/crawl-data/CC-MAIN-2017-04/segments/1484560279169.4/wet/CC-MAIN-20170116095119-00016-ip-10-171-10-70.ec2.internal.warc.wet.gz';
downloadFile(crawlUrl, './data/');
