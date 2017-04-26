import {AlreadyExistsError} from '../classes/errors';
import ReadableStream = NodeJS.ReadableStream;
import {winston} from "./logging";

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
            winston.warn("Using same name for input & output files! Output file was changed to " + outputFilePath);
        }

        // unpack
        if (Unpacker.fs.existsSync(outputFilePath)){
            let err = new AlreadyExistsError(outputFilePath + ' already exists');
            if (callback) { callback(err); }
        } else {
            let input = Unpacker.fs.createReadStream(gzipFilePath);
            let output = Unpacker.fs.createWriteStream(outputFilePath);

            let decompressed = Unpacker.decompressGZipStream(input);
            decompressed.pipe(output);

            // call callback if defined
            output.on("close", function () {
                if (callback) { callback(undefined, outputFilePath); }
            });

        }
    }

    /**
     *
     * Unpack a gzipped stream into another stream.
     * @param input                 gzipped stream
     * @returns {ReadableStream}    decompressed stream
     */
    public static decompressGZipStream(input : ReadableStream) : ReadableStream {
        const gunzip = Unpacker.zlib.createGunzip();
        return input.pipe(gunzip);
    }

    /**
     * Compresses a utf8 string using zlib.deflate. Callback will receive a buffer with raw compressed data.
     * @param str_utf8          string to compress
     * @param callback
     * @returns {Buffer}        buffer with raw compressed data
     */
    public static compressStringToBuffer(str_utf8 : string, callback : (err? : Error, compressedBuffer? : Buffer) => void) {
        let buffer = new Buffer(str_utf8, "utf8");
        Unpacker.zlib.deflate(buffer, callback);
        //return Unpacker.zlib.deflateSync(buffer);
    }

    /**
     * Decompresses a buffer with raw compressed data to a utf8 string.
     * @param compressed     buffer with raw compressed data
     * @param callback
     * @returns {string}     decompressed utf8 string
     */
    public static decompressBufferToString(compressed : Buffer, callback : (err? : Error, decompressedString? : string) => void) {
        Unpacker.zlib.inflate(compressed, (err, decompressedBuffer) => {
            if (err) {
                callback(err);
            } else {
                callback(undefined, decompressedBuffer.toString('utf8'));
            }
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

