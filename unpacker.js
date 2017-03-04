"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require('fs');
var unzip = require('unzip');
/**
 * Unpacks a .zip file into the specified folder (must already exist!).
 *
 * @param zipFilePath           path to the .zip file
 * @param outputFolderPath      path to the output folder, without '/' in the end, folder must exist!
 */
function unpackZipFile(zipFilePath, outputFolderPath) {
    fs.createReadStream(zipFilePath)
        .pipe(unzip.Parse())
        .on('entry', function (entry) {
        var fileName = entry.path;
        var type = entry.type; // 'Directory' or 'File'
        var size = entry.size;
        // no subfolders allowed so far
        if (type == 'Directory') {
            entry.autodrain();
        }
        entry.pipe(fs.createWriteStream(outputFolderPath + "/" + fileName));
    });
}
exports.unpackZipFile = unpackZipFile;
