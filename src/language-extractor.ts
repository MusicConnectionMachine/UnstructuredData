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

    //On the test data only 0.6% pages are not classified, to detect these we can use franc ( execution time increases by only approximately 3% )
    static franc = require('franc');
    static langs = require('langs');

    // CLD and FRANC use different codes for english, when calling isWebPageInLanguage() use this one:
    public static ENGLISH_LANG_CODE = 'en';


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

            //let tld = page.getTLD();
            this.isWebPageInLanguage(page, searchLanguage, function(result : boolean) {
                if(result) {
                    //console.log('writing entry #' + entryID + '!');
                    writeStream.write(page.toString());
                } else {
                    //console.log('skipping entry #' + entryID + '!');
                }
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
     * @param callback
     * @returns {boolean}
     */
    public static isWebPageInLanguage(page : WebPage, searchLanguage : string,
                                      callback: (result : boolean) => void) {
        const content: string = page.content;

        // Search from the middle of the website
        const chunkSize = 300;
        const testStringBeginning: number = chunkSize > content.length ? content.length : chunkSize;
        const testStringEnding: number = content.length - chunkSize > 0 ? content.length - chunkSize : 0;
        const testStringMiddleStart: number = (content.length / 2) - chunkSize > 0 ? (content.length / 2) - chunkSize : 0;
        const testStringMiddleEnd: number = (content.length / 2) + chunkSize < content.length ? (content.length / 2) + chunkSize : content.length;
        const testString = content.substring(0,testStringBeginning) + content.substring(testStringMiddleStart, testStringMiddleEnd) + content.substring(testStringEnding, content.length);

        LanguageExtractor.cld.detect(testString, { isHTML: false,tldHint: page.getTLD()}, function(err, result) {
            if(err) {
                //console.log(err + "page tld: " + page.getTLD());
                //On the test data only 0.6% pages are not classified, to detect these we can use franc ( execution time increases by only approximately 3% )
                callback(LanguageExtractor.franc(testString) == LanguageExtractor.langs.where('1',searchLanguage)['2']);
            } else {
                callback(result.reliable && result.languages[0].code == searchLanguage);
            }
        });
    }

}