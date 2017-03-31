import {WebPage} from "./utils/webpage";


export class LanguageExtractor {

    private static cld = require('cld');
    private static franc = require('franc');
    private static langs = require('langs');

    private static SAMPLE_SIZE = 900;


    /**
     * Calls the callback with the ISO 639-1 language code of the most likely language.
     * @param webPage                           WebPage object
     * @param callback                          Will be called with a ISO 639-1 language code
     */
    public static getPageLanguage(webPage : WebPage, callback : (languageCode : string) => void) {
        const testString = LanguageExtractor.getTestSample(webPage, LanguageExtractor.SAMPLE_SIZE);

        LanguageExtractor.cld.detect(testString, { isHTML: false, tldHint: webPage.getTLD()}, function(err, result) {
            let langCode;
            if(err) {
                let francResult = LanguageExtractor.franc(testString);
                langCode = LanguageExtractor.langs.where("2", francResult)["1"];
            } else {
                langCode = result.languages[0].code;
            }
            callback(langCode);
        });
    }


    /**
     * Filter function. Returns true if the specified web page is most likely to be in the specified language.
     * @param webPage                           WebPage object
     * @param languageCode                      language code in ISO 639-1
     * @param callback                          will called with TRUE if the web page is in the specified language
     */
    public static isWebPageInLanguage(webPage : WebPage, languageCode : string,
                                      callback: (err : Error, result : boolean) => void) {

        if (!LanguageExtractor.langs.has(1, languageCode)) {
            callback(new SyntaxError("Language code not in ISO 639-1!"), undefined);
            return;
        }

        LanguageExtractor.getPageLanguage(webPage, (result) => {
            callback(undefined, languageCode === result);
        });
    }

    /**
     * Extracts some sample text form the start, middle and end from the content of a web page for language detection.
     * If the web page content is shorter than the sampleSize, the sample will be the exact web page content
     * Also if the web page content isn't much longer than the sampleSize, the sample will be a continuous string
     * from the start of the content
     * @param webPage                                               web page to extract sample data from
     * @param sampleSize                                            test sample size, number of characters
     * @returns {string}                                            sample text with the specified length
     */
    public static getTestSample(webPage : WebPage, sampleSize: number) : string {
        const content = webPage.content;

        // trivial case
        if (sampleSize >= content.length) {
            return content;
        }

        // return a continuous string if content length is not significantly longer then sampleSize
        if (sampleSize * 1.3 > content.length) {
            return content.substring(0, sampleSize);
        }

        // extract sample data from the start, middle and end
        const partSize = Math.trunc(sampleSize / 3);
        const lastPartSize = partSize + sampleSize % 3;
        const middleIndex = content.length / 2;

        // start of the middle sample
        const middleSample = middleIndex - partSize / 2;

        // end of the start sample
        const startSample = partSize;

        // start of the end sample
        const endSample = content.length - lastPartSize;

        return content.substring(0, startSample)
            + content.substring(middleSample, middleSample + partSize)
            + content.substring(endSample);
    }

}