"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Unpacker = (function () {
    function Unpacker() {
        this.fs = require('fs');
        this.unzip = require('unzip');
        this.zlib = require('zlib');
    }
    /**
     * Unpacks a .gz file asynchronously into the specified folder.
     * @param gzipFilePath          path to the .gz file
     * @param outputFolderPath      path
     * @param filename              (optional) name for the output file
     * @param callback              (optional) function that will be called once the file is unpacked
     */
    Unpacker.prototype.unpackGZipFileToFile = function (gzipFilePath, outputFolderPath, filename, callback) {
        // filename
        var outputFileName;
        if (filename) {
            // filename provided
            outputFileName = filename;
        }
        else {
            // no filename provided -> take from gzipFilePath & remove ".gz"
            var spl = gzipFilePath.split("/");
            outputFileName = spl[spl.length - 1].replace(".gz", "");
        }
        // unpack
        var gunzip = this.zlib.createGunzip();
        var input = this.fs.createReadStream(gzipFilePath);
        var output = this.fs.createWriteStream(outputFolderPath + "/" + outputFileName);
        input.pipe(gunzip).pipe(output);
        // call callback if defined
        output.on("close", function () {
            if (callback) {
                callback();
            }
        });
    };
    /**
     * Unpacks a .zip file into the specified folder (must already exist). The .zip file must be plain since subfolders
     * are not yet supported.
     *
     * @param zipFilePath           path to the .zip file
     * @param outputFolderPath      path to the output folder, folder must exist!
     */
    Unpacker.prototype.unpackZipFileToFile = function (zipFilePath, outputFolderPath) {
        var fs2 = this.fs;
        var input = this.fs.createReadStream(zipFilePath);
        input.pipe(this.unzip.Parse())
            .on('entry', function (entry) {
            var fileName = entry.path;
            var type = entry.type; // 'Directory' or 'File'
            //let size = entry.size;
            // no subfolders allowed so far
            if (type == 'Directory') {
                entry.autodrain();
            }
            entry.pipe(fs2.createWriteStream(outputFolderPath + "/" + fileName));
        });
    };
    return Unpacker;
}());
exports.Unpacker = Unpacker;
