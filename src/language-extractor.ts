/**
 * Created by Anshul on 3/7/2017.
 */

import {AlreadyExistsError,UnsupportedFileFormat} from './utils';
import {WebPage} from "./web-page";

export class LanguageExtractor {

    static path = require('path');
    static fs = require('fs');
    static cld = require('cld');
    static WARCStream = require('warc');


    /**
     * This function reads all web page entries from the WET file on "wetDataFilePath".
     * Each entry is converted into a WebPage object, afterwards language detection is performed.
     * All WebPage objects that have the specified language are written into another WET file
     * Output file name is generated from the input file name.
     *
     * This is super slow! :P
     *
     * @param wetDataFilePath   path to the input WET file
     * @param searchLanguage    language string
     * @param callback          callback
     */
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
            return;
        }

        // open each file in the folder as stream and pipe it to the warc parser
        const WARCParser = new LanguageExtractor.WARCStream();
        let entryID = 0;

        //open the output file
        const writeStream = LanguageExtractor.fs.createWriteStream(outputFile, {flags: 'w'});
        const readStream = LanguageExtractor.fs.createReadStream(wetDataFilePath);
        readStream.pipe(WARCParser).on('data', data => {

            let page : WebPage = new WebPage(data);
            // write only if the web page object is in english AND really represents a web page (and not the first entry of a WET file)

            let tld = page.getTLD();
            this.isWebPageInLanguage(page, searchLanguage, tld, function(result : boolean) {
                if(result) {
                    console.log('writing entry #' + entryID + '!');

                    writeStream.write(data.protocol.toString('utf8') + '\n');
                    for (let property in data.headers) {
                        writeStream.write(property + ': ' + data.headers[property] + '\n');
                    }
                    writeStream.write('\n' + page.content + '\n');
                } else {
                    console.log('skipping entry #' + entryID + '!');
                }
                entryID++;
            });

            entryID++;
        }).on('end', function() {
            // read stream ready
            // just to be sure we set a 100ms timeout
            // last entry should be written by then
            setTimeout(function () {
                writeStream.close();
            }, 10);
        });

        writeStream.on("close", function() {
            // calling a callback in another callback
            if (callback) {
                callback(undefined, outputFile);
            }
        });

    }


    /**
     * Filter function. Returns true if the specified web page is in the specified language.
     *
     * @param page                  web page object (constructed from WARC parser data)
     * @param searchLanguage        language string
     * @returns {boolean}
     */
    public static isWebPageInLanguage(page : WebPage, searchLanguage : string, tld : string,
                                      callback: (result : boolean) => void) {
        const content: string = page.content;

        // Search from the middle of the website
        const testStringStart: number = (content.length / 2) - 250 > 0 ? (content.length / 2) - 250 : 0;
        const testStringEnd: number = (content.length / 2) + 250 < content.length ? (content.length / 2) + 250 : content.length;
        const testString = content.substring(testStringStart, testStringEnd);

        LanguageExtractor.cld.detect(testString, { tldHint: tld}, function(err, result) {
            if(err) {
                console.log(err);
                callback(false);
            } else {
                callback(result.reliable && result.languages[0].code == searchLanguage);
            }
        });
    }

}