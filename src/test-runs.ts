import { Downloader } from "./downloader";
import { Unpacker } from "./unpacker";
import { WordPreprocessor } from "./word-preprocessor";
import { WebPage } from "./web-page";
import { LanguageExtractor } from "./language-extractor";

/**
 * Playground for testing.
 *
 */
export class TestRuns {

    //region variables
    static fs = require('fs');
    static path = require('path');
    static WARCStream = require('warc');

    static crawlBaseUrl = 'https://commoncrawl.s3.amazonaws.com/crawl-data/CC-MAIN-2017-04/segments/1484560279169.4/wet/';
    static dataFolder = './data/';
    static fileName_packed = 'CC-MAIN-20170116095119-00016-ip-10-171-10-70.ec2.internal.warc.wet.gz';
    static fileName_unpacked = 'CC-MAIN-20170116095119-00016-ip-10-171-10-70.ec2.internal.warc.wet';
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

    /**
     * Download file, unpack it, feed to the WARC parser and finally get stems & TLD
     */
    //region download-unpack-stem-TLD
    static testDownloadUnpackingAndStemming() {
        TestRuns.prepareEnvironment();

        console.log("starting download ...");

        Downloader.downloadFile(TestRuns.crawlBaseUrl + TestRuns.fileName_packed, TestRuns.dataFolder, (err, filepath) => {

            // downloader is ready
            if (err) {
                console.log(err);
                return;
            } else {
                console.log("downloading complete!");
            }

            // download ok -> unpack
            Unpacker.unpackGZipFileToFile(filepath, TestRuns.dataFolder, undefined, (err, filepath) => {
                if (err) {
                    console.log(err);
                    return;
                } else {
                    console.log("unpacking complete!");
                }

                // TODO: Language filter
                // TODO: Term filter

                let entryID = 0;

                // we can start digesting here
                // open file as stream and pipe it to the warc parser
                const WARCParser = new TestRuns.WARCStream();
                TestRuns.fs.createReadStream(filepath).pipe(WARCParser).on('data', data => {

                    let page = new WebPage(data);

                    // log content of each entry in console
                    let stems = WordPreprocessor.process(page.content);

                    // print only the first few results
                    if (entryID < 100) {
                        //console.log(page.content);
                        console.log("\n\n---------------------\nTLD: "+ page.getTLD() + "\n---------------------");
                        console.log(stems);

                    } else {
                        // stop
                        process.exit();

                    }
                    entryID++;
                });
            });
        });
    };
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
     * Load already downloaded and unpacked file, feed it to LanguageExtractor
     * that will create another file with pages in english. This is super slow!
     *
     * After ages, the new file is written to the disk and SHOULD be read again,
     * fed to the WARC parser and processed with WordPreprocessor.
     * HOWEVER, THIS IS NOT HAPPENING. Probably problems with callbacks...
     *
     * Anyway, a better scenario is presented below this test run.
     */
    //region LanguageExtractor - super slow
    static testLanguageExtractor_super_slow() {

        TestRuns.prepareEnvironment();
        let entryID = 0;

        // THE DATA FILE IS ALREADY DOWNLOADED AND UNPACKED

        const WARCParser = new TestRuns.WARCStream();
        const filepath = TestRuns.dataFolder + TestRuns.fileName_unpacked;

        // Extract english pages
        LanguageExtractor.extractWETPages(filepath, 'eng', (err,filepath) => {

            // this callback is behaving strangely!
            // but it's too late in the night to debug :P

            if (err) {
                console.log(err);
                return;
            } else {
                console.log("English pages extraction complete!");
            }

            // pages were extracted and written to ANOTHER WET file
            // open file as stream and pipe it to the warc parser
            this.fs.createReadStream(filepath).pipe(WARCParser).on('data', data => {

                // log content of each entry in console
                let p = new WebPage(data);
                let stems = WordPreprocessor.process(p.content);

                console.log("\n\n---------------------\nTLD: "+ p.getTLD() + "\n---------------------");
                console.log(stems);

                entryID++;
                if (entryID > 100) process.exit();
            }).on('error', function(err) {
                console.log(err);
            });
        });
    }
    //endregion


    /**
     * Load already downloaded and unpacked WET file, feed it to WARC parser, create a WebPage
     * object from each entry and filter the results with LanguageExtractor directly. No temporary
     * buffering on the disk -> runs slightly faster than the sad example above.
     */
    //region LanguageExtractor - slightly better
    static testLanguageExtractor_slightly_better() {
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

            LanguageExtractor.isWebPageInLanguage(p, 'en', tld, function(result : boolean) {
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



}
