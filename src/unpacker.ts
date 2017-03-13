import {AlreadyExistsError} from './utils';
import {ReadStream} from "fs";
import {WriteStream} from "fs";

export class Unpacker {

    static fs = require('fs');
    static unzip = require('unzip');
    static zlib = require('zlib');
    static path = require('path');


    /**
     * Unpacks a .gz file asynchronously into the specified folder.
     * @param gzipFilePath          path to the .gz file
     * @param outputFolderPath      path
     * @param filename              (optional) name for the output file
     * @param callback              (optional) function that will be called once the file is unpacked (no parameters)
     */
    public static unpackGZipFileToFile(gzipFilePath : string,
                                outputFolderPath : string,
                                filename? : string,
                                callback? : (err? : Error, filepath? : string) => void) : void {

        // filename
        let outputFileName : string;
        if (filename) {
            // filename provided
            outputFileName = filename;
        } else {
            // no filename provided -> take from gzipFilePath & remove ".gz"
            outputFileName = Unpacker.path.basename(gzipFilePath).replace(".gz", "");
        }
        let outputFilePath : string = Unpacker.path.join(outputFolderPath, outputFileName);
        outputFilePath = Unpacker.path.normalize(outputFilePath);
        gzipFilePath = Unpacker.path.normalize(gzipFilePath);
        //do not use the same name for input & output
        if (outputFilePath == gzipFilePath) {
            outputFilePath += ".unpacked";
            console.warn("Using same name for input & output files! Output file was changed to " + outputFilePath);
        }

        // unpack
        if (Unpacker.fs.existsSync(outputFilePath)){
            let err = new AlreadyExistsError(outputFilePath + ' already exists');
            if (callback) { callback(err); }
        } else {
            let input = Unpacker.fs.createReadStream(gzipFilePath);
            let output = Unpacker.fs.createWriteStream(outputFilePath);

            // call callback if defined
            output.on("close", function () {
                if (callback) { callback(undefined, outputFilePath); }
            });

            Unpacker.unpackGZipStreamToStream(input, output);
        }
    }


    /**
     * Unpack a gzipped stream into another stream.
     * @param input     gzipped stream
     * @param output    output stream
     * @param callback  optional callback, called when output is closed
     */
    public static unpackGZipStreamToStream(input : ReadStream,
                                           output : WriteStream,
                                           callback? : () => void ) : void {

        const gunzip = Unpacker.zlib.createGunzip();
        input.pipe(gunzip).pipe(output);

        // call callback if defined
        if (callback)   output.on("close", callback);

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
    public static unpackZipFileToFile(zipFilePath : string,
                               outputFolderPath : string) : void {

        let fs2 = Unpacker.fs;
        let input = Unpacker.fs.createReadStream(zipFilePath);

        input.pipe(Unpacker.unzip.Parse())
            .on('entry', function (entry) {

                let fileName = entry.path;
                let type = entry.type; // 'Directory' or 'File'
                //let size = entry.size;

                // no subfolders allowed so far
                if (type == 'Directory') {
                    entry.autodrain();
                }

                entry.pipe(fs2.createWriteStream(Unpacker.path.join(outputFolderPath, fileName)));

            });
    }

}


