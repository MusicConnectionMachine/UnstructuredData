import { Downloader } from "./downloader";
import { Unpacker } from "./unpacker";
import { WordPreprocessor } from "./word-preprocessor";
import { WebPage } from "./utils/webpage";
import { LanguageExtractor } from "./language-extractor";
import { WetManager } from "./wet-manager";
import { CCIndex } from "./cc-index";
import { Storer } from "./storer";


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

            LanguageExtractor.isWebPageInLanguage(p, ["en"], function(err, result) {
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

            LanguageExtractor.isWebPageInLanguage(p, ['en'], function(err, result) {
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

        const ccIndex = new CCIndex();
        ccIndex.getWETPathsForURL(lookupURL, (err, wetPaths) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log("found " + lookupURL + " in following files:");
            console.log(wetPaths);

        }, 20000);

    }

    public static testStorer() {
        let url = 'crawl-data/CC-MAIN-2017-09/segments/1487501172017.60/wet/CC-MAIN-20170219104612-00150-ip-10-171-10-108.ec2.internal.warc.wet.gz';
        let storer = new Storer("blobAccount", "blobContainer", "blobKey");
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

    /**
     * Create dummy website, store it compressed on Azure, download again, decompress and check if contents are the same.
     */
    public static testCompressedStorage() {

        // create dummy website
        let w = new WebPage();
        w.protocol = "WARC OLOLOLO";
        w.content = "testContent";
        w.headers = {
            "WARC-Type": "conversion",
            "WARC-Target-URI": "http://bleacherreport.com/articles/2041429-liverpool-vs-chelsea-english-premier-league-odds-preview-and-prediction",
            "WARC-Date": "2017-02-26T15:25:57Z",
            "WARC-Record-ID": "<urn:uuid:96e54143-9438-4f7a-b8ac-eaeda1be4941>",
            "WARC-Refers-To": "<urn:uuid:f99f87dc-423e-4a4f-a10a-d3cbda0e4f6f>",
            "WARC-Block-Digest": "sha1:LC3ZP2ICLSI6QI4MODAJGGUZ3M2NJNSK",
            "Content-Type": "text/plain",
            "Content-Length": "11048"
        };

        // store on azure (storer will compress it)
        let storer = new Storer("blobAccount", "blobContainer", "blobKey");
        storer.storeWebsiteBlob(w, (err, blobName) => {
            if (err) {
                console.log(err);
                return;
            }

            let url = "https://wetstorage.blob.core.windows.net/websites/" + blobName;
            console.log("stored to: " + url);
            console.log("downloading");

            // stored, download and check
            Downloader.getResponse(url, (err, incMsg) => {
                if (err) {
                    console.log(err);
                    return;
                }

                let bufs = [];
                incMsg.on('data', function(d){ bufs.push(d); });
                incMsg.on('end', function() {
                    // got all data
                    let buf = Buffer.concat(bufs);

                    Unpacker.decompressBufferToString(buf, (err, decompressed) => {
                        if (err) {
                            console.log(err);
                            return;
                        }

                        console.log("got all data!");
                        //console.log(decompressed);

                        // check if everything is osome
                        console.log("Checking equality: " + (w.toWARCString() == decompressed));

                    });

                });


            }, 1000);


        });


    }
}

TestRuns.testCCIndex();