import { Downloader } from "./downloader";
import { Unpacker } from "./unpacker";
import { WordPreprocessor } from "./word-preprocessor";
import { WebPage } from "./utils/webpage";
import { LanguageExtractor } from "./language-extractor";
import { WetManager } from "./wet-manager";
import { CCIndex } from "./cc-index";
import { Storer } from "./storer";
import {TermLoader} from "./utils/term-loader";
import {BloomFilter} from "./filters/bloom-filter";

/**
 * Playground for testing.
 *
 */
export class TestRuns {

    //region variables
    static fs = require('fs');
    static path = require('path');
    static WARCStream = require('warc');
    //static rwStream = require("read-write-stream");

    static dataFolder = './data/';

    //Feb 17 Crawl data which contains https://www.britannica.com/topic/Chaconne-by-Bach
    static crawlBaseUrl = 'https://commoncrawl.s3.amazonaws.com/crawl-data/CC-MAIN-2017-09/segments/1487501172017.60/wet/';
    static fileName_packed = 'CC-MAIN-20170219104612-00150-ip-10-171-10-108.ec2.internal.warc.wet.gz';
    static fileName_unpacked = 'CC-MAIN-20170219104612-00150-ip-10-171-10-108.ec2.internal.warc.wet';
    //Jan 17 Crawl data
    //static crawlBaseUrl = 'https://commoncrawl.s3.amazonaws.com/crawl-data/CC-MAIN-2017-04/segments/1484560279169.4/wet/';
    //static fileName_packed = 'CC-MAIN-20170116095119-00016-ip-10-171-10-70.ec2.internal.warc.wet.gz';
    //static fileName_unpacked = 'CC-MAIN-20170116095119-00016-ip-10-171-10-70.ec2.internal.warc.wet';
    //endregion

    //region prepare environment
    private static prepareEnvironment ()  {
        // create folder or use existing one
        try {
            TestRuns.fs.mkdirSync(TestRuns.dataFolder);
        } catch(e) {
            if (e.code != 'EEXIST') { throw e; }
        }
    }
    //endregion

    //region download & unpack
    /**
     * Downloads and unpacks the WET file. Every step is written to disk.
     * Finally, the result is passed to the WARC parser to print all URIs.
     */
    static downloadUnpack_sequential() {
        TestRuns.prepareEnvironment();

        console.log("starting download ...");

        Downloader.downloadToFile(TestRuns.crawlBaseUrl + TestRuns.fileName_packed, TestRuns.dataFolder, (err, filepath) => {
            if (err) { console.log(err);  return;  }

            // download ok -> unpack
            console.log("downloading complete!");
            Unpacker.unpackGZipFileToFile(filepath, TestRuns.dataFolder, undefined, (err, filepath) => {
                if (err) { console.log(err);  return; }

                // we can start digesting here
                console.log("unpacking complete!");

                // open file as stream and pipe it to the warc parser
                const WARCParser = new TestRuns.WARCStream();
                TestRuns.fs.createReadStream(filepath).pipe(WARCParser).on('data', data => {
                    // Do anything here
                    let page = new WebPage(data);
                    console.log(page.getURI());
                });
            });
        });
    };



    /**
     * Downloads and unpacks the WET file without temporary caching on disk.
     * Only the unpacked result is written on disk. No processing.
     */
    public static downloadUnpack_streamed() {
        let filename = TestRuns.crawlBaseUrl + TestRuns.fileName_packed;
        console.log("downloading and unpacking " + filename);
        Downloader.getResponse(filename, (err, response) => {
            if (err) {
                console.log(err);
                return;
            }

            // unpack & write to file
            let decompressed = Unpacker.decompressGZipStream(response);
            let output = Unpacker.fs.createWriteStream(TestRuns.path.join(TestRuns.dataFolder, TestRuns.fileName_unpacked));
            decompressed.pipe(output);

        });
    }

    //endregion



    /**
     * Load already downloaded and unpacked file and get TLDs.
     */
    //region TLD only
    static testTLD() {

        TestRuns.prepareEnvironment();
        let entryID = 0;

        // THE DATA FILE IS ALREADY DOWNLOADED AND UNPACKED

        // open file as stream and pipe it to the warc parser
        const WARCParser = new TestRuns.WARCStream();
        const filepath = TestRuns.dataFolder + TestRuns.fileName_unpacked;
        TestRuns.fs.createReadStream(filepath).pipe(WARCParser).on('data', data => {

            let p = new WebPage(data);
            // print only the first few results
            if (entryID < 1000) {
                console.log("Entry #" + entryID
                    + "\tTLD: "+ p.getTLD() + " "
                    + "\tIsWebPage: " + p.isWebPage() + " "
                    + "\tURI: " + p.getURI());

            } else {
                // stop
                process.exit();
            }
            entryID++;
        });
    };
    //endregion


    /**
     * Load already downloaded and unpacked WET file, feed it to WARC parser, create a WebPage
     * object from each entry and filter the results with LanguageExtractor directly. No temporary
     * buffering on the disk.
     */
    //region LanguageExtractor
    static testLanguageExtractor() {
        TestRuns.prepareEnvironment();
        let entryID = 0;
        let timeStart = new Date().getTime();


        // THE DATA FILE IS ALREADY DOWNLOADED AND UNPACKED

        const WARCParser = new TestRuns.WARCStream();
        const filepath = TestRuns.dataFolder + TestRuns.fileName_unpacked;


        let stream = TestRuns.fs.createReadStream(filepath).pipe(WARCParser);

        stream.on('data', data => {

            let p = new WebPage(data);

            let tld = p.getTLD();

            LanguageExtractor.isWebPageInLanguage(p, LanguageExtractor.ENGLISH_LANG_CODE, function(result : boolean) {
                console.log("Entry #" + entryID
                    + "\tTLD: "+ tld + " "
                    + "\tIsEnglish: " + result + " "
                    + "\tIsWebPage: " + p.isWebPage() + " "
                    + "\tTimePassed: " + ((new Date().getTime()) - timeStart)
                    + "\tURI: " + p.getURI()
                );
                entryID++;
            });
        });

        stream.on('end', () => {
            console.log('finished. Time passed: ' + ((new Date().getTime()) - timeStart));
        })

    }
    //endregion


    /**
     * Load already downloaded and unpacked WET file, feed it to WARC parser, create a WebPage
     * object from each entry and filter the results with LanguageExtractor directly and feed them
     * into the WordPreprocessor. No temporary buffering on the disk.
     */
    //region Pre-Processing
    static testPreProcessingChain() {
        TestRuns.prepareEnvironment();
        let timeStart = new Date().getTime();

        // THE DATA FILE IS ALREADY DOWNLOADED AND UNPACKED

        const WARCParser = new TestRuns.WARCStream();
        const filepath = TestRuns.path.join(TestRuns.dataFolder, TestRuns.fileName_unpacked);


        let stream = TestRuns.fs.createReadStream(filepath).pipe(WARCParser);

        stream.on('data', data => {

            let p = new WebPage(data);

            LanguageExtractor.isWebPageInLanguage(p, 'en', function(result : boolean) {
                if (result) {
                    console.log("processing result ");
                    WordPreprocessor.process(p.content);
                }
            });
        });

        stream.on('end', () => {
            console.log('finished. Time passed: ' + ((new Date().getTime()) - timeStart));
        })

    }
    //endregion


    public static testWetManager() {
        let url = 'crawl-data/CC-MAIN-2017-09/segments/1487501172017.60/wet/CC-MAIN-20170219104612-00150-ip-10-171-10-108.ec2.internal.warc.wet.gz';
        let timeStart = new Date().getTime();
        WetManager.loadWetAsStream(url, function(err, result) {
            if(err) {
                console.log(err);
                return;
            }

            let warcParser = new TestRuns.WARCStream();

            result.pipe(warcParser).on('data', data => {

                // getting WET entries here
                let p = new WebPage(data);
                console.log(p.getURI());
            }).on('end', () => {
                let timeFinish = new Date().getTime();
                console.log('Finished. Took ' + (timeFinish - timeStart) + 'ms');
            });
        }, false);
    }

    /**
     * Search for occurrences of a specific URLs in the CC index.
     */
    public static testCCIndex() {
        let lookupURL = "https://github.com/";
        console.log("looking up: " + lookupURL);
        CCIndex.getWETPathsForURL(lookupURL, (err, wetPaths) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log("found " + lookupURL + " in following files:");
            console.log(wetPaths);

        });

    }

    public static testStorer() {
        let url = 'crawl-data/CC-MAIN-2017-09/segments/1487501172017.60/wet/CC-MAIN-20170219104612-00150-ip-10-171-10-108.ec2.internal.warc.wet.gz';
        let storer = new Storer();
        WetManager.loadWetAsStream(url, function(err, result) {
            if(err) {
                console.log(err);
                return;
            }

            let warcParser = new TestRuns.WARCStream();
            let counter = 0;
            result.pipe(warcParser).on('data', data => {

                let tick = Math.random() * 10000;
                // getting WET entries here
                if(tick < 1) {
                    counter++;
                    if (counter <= 10) {
                        console.log('Storing number ' + counter);
                        let p = new WebPage(data);
                        storer.storeWebsite(p);
                    }
                }
            }).on('end', () => {
                console.log('Finished.');
            });
        }, true);
    }

}
