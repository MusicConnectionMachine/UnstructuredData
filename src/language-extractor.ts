/**
 * Created by Anshul on 3/7/2017.
 */

import {AlreadyExistsError,UnsupportedFileFormat} from './utils';

export class LanguageExtractor {

    static path = require('path');
    static fs = require('fs');
    static franc = require('franc');
    static WARCStream = require('warc');

    // To extract pages of specified language
    public static extractWETPages(wetDataFilePath: string,
                                  searchLanguage: string,
                                  callback? : (err? : Error, filepath? : string) => void) : void {

        //choose a wet file and set output filename wet data file name and the language it was extracted for
        if (!LanguageExtractor.path.extname(wetDataFilePath).match('.wet')) {
            let err = new UnsupportedFileFormat('This file format is not supported');
            if(callback) {
                callback(err);
            }
            return;
        }

        let outputFile = wetDataFilePath.replace(".wet","_"+searchLanguage+".wet");

        if (LanguageExtractor.fs.existsSync(outputFile)) {
            let err = new AlreadyExistsError(outputFile + ' already exists');
            if (callback) {
                callback(err);
            }
        }
        else{

            // open each file in the folder as stream and pipe it to the warc parser
            const WARCParser = new LanguageExtractor.WARCStream();

            //open the output file
            const writeStream = LanguageExtractor.fs.createWriteStream(outputFile, {flags: 'w'});
            LanguageExtractor.fs.createReadStream(wetDataFilePath).pipe(WARCParser).on('data', data => {

                // write only english content to a new file
                const content: string = data.content.toString('utf8');

                // Search from the middle of the website
                const testStringStart: number = (content.length / 2) - 250 > 0 ? (content.length / 2) - 250 : 0;
                const testStringEnd: number = (content.length / 2) + 250 < content.length ? (content.length / 2) + 250 : content.length;
                const testString = content.substring(testStringStart, testStringEnd);

                // If website matches the language write to file
                if (LanguageExtractor.franc(testString).match(searchLanguage)) {
                    writeStream.write(data.protocol.toString('utf8') + '\n');
                    for (let property in data.headers) {
                        writeStream.write(property + ': ' + data.headers[property] + '\n');
                    }
                    writeStream.write('\n' + content + '\n');
                }
            });

            if (callback) {
                callback(undefined, outputFile);
            }
        }
    }
}