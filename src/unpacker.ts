export class Unpacker {

    fs = require('fs');
    unzip = require('unzip');
    zlib = require('zlib');
    path = require('path');


    /**
     * Unpacks a .gz file asynchronously into the specified folder.
     * @param gzipFilePath          path to the .gz file
     * @param outputFolderPath      path
     * @param filename              (optional) name for the output file
     * @param callback              (optional) function that will be called once the file is unpacked (no parameters)
     */
    public unpackGZipFileToFile(gzipFilePath : string,
                                outputFolderPath : string,
                                filename? : string,
                                callback? : () => void) : void {

        // filename
        let outputFileName : string;
        if (filename) {
            // filename provided
            outputFileName = filename;
        } else {
            // no filename provided -> take from gzipFilePath & remove ".gz"
            let spl = gzipFilePath.split("/");
            outputFileName = spl[spl.length - 1].replace(".gz", "");
        }
        let outputFilePath : string = this.path.join(outputFolderPath, outputFileName);
        outputFilePath = this.path.normalize(outputFilePath);
        gzipFilePath = this.path.normalize(gzipFilePath);
        //do not use the same name for input & output
        if (outputFilePath == gzipFilePath) {
            outputFilePath += ".unpacked";
            console.warn("Using same name for input & output files! Output file was changed to " + outputFilePath);
        }

        // unpack
        const gunzip = this.zlib.createGunzip();
        let input = this.fs.createReadStream(gzipFilePath);
        let output = this.fs.createWriteStream(outputFilePath);
        input.pipe(gunzip).pipe(output);

        // call callback if defined
        output.on("close", function () {
            if (callback) { callback(); }
        });
    }

    /**
     * @deprecated not tested well yet
     *
     * Unpacks a .zip file into the specified folder (must already exist). The .zip file must be plain since subfolders
     * are not yet supported.
     *
     * @param zipFilePath           path to the .zip file
     * @param outputFolderPath      path to the output folder, folder must exist!
     */
    public unpackZipFileToFile(zipFilePath : string,
                               outputFolderPath : string) : void {

        let fs2 = this.fs;
        let input = this.fs.createReadStream(zipFilePath);

        input.pipe(this.unzip.Parse())
            .on('entry', function (entry) {

                let fileName = entry.path;
                let type = entry.type; // 'Directory' or 'File'
                //let size = entry.size;

                // no subfolders allowed so far
                if (type == 'Directory') {
                    entry.autodrain();
                }

                entry.pipe(fs2.createWriteStream(outputFolderPath + "/" + fileName));

            });
    }

}


