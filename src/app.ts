
// require some stuff
const fs = require('fs');
const path = require('path');
const WARCStream = require('warc');
const WARCParser = new WARCStream();


// read filenames inside the specified folder
const dataFolder = './data/';
fs.readdir(dataFolder, (err, files) => {
    files.forEach(file => {

        // we only want none compressed .wet, .wat or .warc files
        if (path.extname(file).match(/\.wet|\.wat|\.warc/)){

            // open each file in the folder as stream and pipe it to the warc parser
            fs.createReadStream(dataFolder + file).pipe(WARCParser).on('data', data => {

                // log content of each entry in console
                const content: string = data.content.toString('utf8');
                console.log(content);
            });
        }
    });
});
