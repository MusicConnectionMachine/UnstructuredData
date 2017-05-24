import ReadableStream = NodeJS.ReadableStream;
import * as zlib from "zlib";

export class Unpacker {


    /**
     *
     * Unpack a gzipped stream into another stream.
     * @param input                 gzipped stream
     * @returns {ReadableStream}    decompressed stream
     */
    public static decompressGZipStream(input : ReadableStream) : ReadableStream {
        const gunzip = zlib.createGunzip();
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
        zlib.deflate(buffer, callback);
    }

    /**
     * Decompresses a buffer with raw compressed data to a utf8 string.
     * @param compressed     buffer with raw compressed data
     * @param callback
     * @returns {string}     decompressed utf8 string
     */
    public static decompressBufferToString(compressed : Buffer, callback : (err? : Error, decompressedString? : string) => void) {
        zlib.inflate(compressed, (err, decompressedBuffer) => {
            if (err) {
                callback(err);
            } else {
                callback(undefined, decompressedBuffer.toString('utf8'));
            }
        });
    }
}


