// require some stuff
var fs = require('fs');
var path = require('path');
var WARCStream = require('warc');
var dataFolder = './data/';
// read filenames inside the specified folder
fs.readdir(dataFolder, function (err, files) {
    files.forEach(function (file) {
        // we only want none compressed .wet, .wat or .warc files
        if (path.extname(file).match(/\.wet|\.wat|\.warc/)) {
            // open each file in the folder as stream and pipe it to the warc parser
            var WARCParser = new WARCStream();
            fs.createReadStream(dataFolder + file).pipe(WARCParser).on('data', function (data) {
                // log content of each entry in console
                var content = data.content.toString('utf8');
                console.log(content);
            });
        }
    });
});
