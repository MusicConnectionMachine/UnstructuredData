/**
 * Created by Anshul on 3/6/2017.
 */

const path = require('path');
const fs = require('fs');
var franc = require('franc');
const WARCStream = require('warc');
var writeStream = fs.createWriteStream('./data/english.wet', { flags : 'w' });

// extracting only english pages
function extractEnglishPages(filepath : string) : void {

    //choose wet files and other common crawl formats
    if (path.extname(filepath).match(/\.wet|\.wat|\.warc/)){

        // open each file in the folder as stream and pipe it to the warc parser
        const WARCParser = new WARCStream();
        fs.createReadStream(filepath).pipe(WARCParser).on('data', data => {

            // write only english content to a new file
            const content: string = data.content.toString('utf8');
            var testString = content.substring(0,500);
            if(franc(testString).match("eng")){
                writeStream.write(content);
            }
        });
    }
}

extractEnglishPages("./data/CC-MAIN-20170116095119-00016-ip-10-171-10-70.ec2.internal.warc.wet");