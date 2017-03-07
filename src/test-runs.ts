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
    static fileName = 'CC-MAIN-20170116095119-00016-ip-10-171-10-70.ec2.internal.warc.wet.gz';
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

    //region download-unpack-stem-TLD
    /**
     * Download file, unpack it, feed to the WARC parser and finally get stems & TLD
     */
    static testDownloadUnpackingAndStemming() {
        TestRuns.prepareEnvironment();

        console.log("starting download ...");

        Downloader.downloadFile(TestRuns.crawlBaseUrl + TestRuns.fileName, TestRuns.dataFolder, (err, filepath) => {

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

                    let p = new WebPage(data);

                    // log content of each entry in console
                    let stems = WordPreprocessor.process(p.content);

                    // print only the first few results
                    if (entryID < 100) {
                        //console.log(p.content);
                        console.log("\n\n---------------------\nTLD: "+ p.getTLD() + "\n---------------------");
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

    //region TLD only
    /**
     * Load already downloaded and unpacked file and get TLDs.
     */
    static testTLD() {

        TestRuns.prepareEnvironment();
        let entryID = 0;

        // THE DATA FILE IS ALREADY DOWNLOADED AND UNPACKED

        // open file as stream and pipe it to the warc parser
        const WARCParser = new TestRuns.WARCStream();
        const filepath = TestRuns.dataFolder + (TestRuns.fileName.replace(".gz", ""));
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

    //region LanguageExtractor
    static testLanguageExtractor() {

        TestRuns.prepareEnvironment();
        let entryID = 0;

        // THE DATA FILE IS ALREADY DOWNLOADED AND UNPACKED

        const WARCParser = new TestRuns.WARCStream();
        const filepath = TestRuns.dataFolder + (TestRuns.fileName.replace(".gz", ""));

        // Extract english pages
        LanguageExtractor.extractWETPages(filepath, 'eng', (err,filepath) => {
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
            });


        });


    }



    //endregion


}
