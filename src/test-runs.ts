import { Downloader } from "./downloader";
import { Unpacker } from "./unpacker";
import { WordPreprocessor } from "./word-preprocessor";
import { WebPage } from "./web-page";
import { LanguageExtractor } from "./language-extractor";
import {TermSearch, Occurrence} from "./term-search";

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

    //region create files with filtered data
    /**
     * Extract all english pages from a file and write them into another.
     */
    public static testExtractAllEnglishPages() {
        TestRuns.prepareEnvironment();
        // THE DATA FILE IS ALREADY DOWNLOADED AND UNPACKED
        const filepath = TestRuns.dataFolder + TestRuns.fileName_unpacked;

        console.log("extracting english only pages from " + filepath);
        // Extract english pages
        LanguageExtractor.extractWETPages(filepath, LanguageExtractor.ENGLISH_LANG_CODE, (err,filepath) => {
            if (err) {
                console.log(err);
            } else {
                console.log("done!");
            }
        });
    }

    public static createFilteredSampleDataForGroups3_4() {
        console.log("Creating sample data for groups 3 & 4");
        console.log("Sending request... ");

        // some hardcoded composers here
        let terms = ['Adams', 'Bach', 'Barber', 'Beethoven', 'Berg', 'Berlioz',
            'Bernstein', 'Bizet', 'Borodin', 'Brahms', 'Britten', 'Byrd', 'Chopin',
            'Copland', 'Couperin', 'Debussy', 'Donizetti', 'Elgar', 'Ellington',
            'Gabrieli', 'Gershwin', 'Glass', 'Gounod', 'Grieg', 'Handel', 'Harrison',
            'Haydn', 'Holst', 'Ives', 'Joplin', 'Liszt', 'Mahler', 'Mendelssohn',
            'Monteverdi', 'Mozart', 'Offenbach', 'Palestrina', 'Prokofiev', 'Puccini',
            'Purcell', 'Rachmaninov', 'Rameau', 'Ravel', 'Rossini', 'Satie', 'Schubert',
            'Schumann', 'Shostakovich', 'Sibelius', 'Smetana', 'Strauss', 'Stravinsky',
            'Tchaikovsky', 'Telemann',  'Verdi', 'Vivaldi', 'Wagner', 'Williams'];

        let outputFile = TestRuns.dataFolder + TestRuns.fileName_unpacked + "_filtered";
        const writeStream = LanguageExtractor.fs.createWriteStream(outputFile, {flags: 'w'});
        let pagesFound = 0;

        Downloader.getResponse(
            TestRuns.crawlBaseUrl + TestRuns.fileName_packed, (err, response) => {
                if (err) {
                    console.log(err);
                    return;
                }

                // unpack & feed into WARC parser
                let decompressed = Unpacker.decompressGZipStream(response);
                const WARCParser = new TestRuns.WARCStream();
                decompressed.pipe(WARCParser).on('data', data => {

                    // getting WET entries here
                    let p = new WebPage(data);

                    //Check if page is in english
                    LanguageExtractor.isWebPageInLanguage(p, LanguageExtractor.ENGLISH_LANG_CODE, function (result: boolean) {
                        if (!result)  return;

                        // search for terms
                        let totalOccs = 0;
                        let distinctOccs = 0;
                        let occs : Array<Occurrence> = TermSearch.searchTermsInString(p.content, terms, false);
                        for (let occ of occs) {
                            distinctOccs++;
                            totalOccs += occ.positions.length;
                        }


                        // print to console
                        if (totalOccs > 0) {
                            let str = "found ";
                            for (let occ of occs) {
                                str += occ.term + " x" + occ.positions.length + ", ";
                            }
                            console.log(str.substring(0, str.length - 2) + "\t\t\t on " + p.getURI());
                        }

                        // if page is good, print to file
                        if (distinctOccs > 4 && totalOccs > 9) {
                            // this page is considered as good
                            writeStream.write(p.toString());

                            pagesFound++;
                            if (pagesFound > 100) {
                                writeStream.close();
                                console.log("found enough good pages!");
                                process.exit(0);
                            }
                        }


                    });
                });




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




    /**
     * Download and process file completely without caching on disk.
     * The processing starts as soon as we get the first bytes from the server.
     */
    public static testStreamedDownloadUnpackingAndProcessing() {
        console.log("Sending request... ");

        Downloader.getResponse(TestRuns.crawlBaseUrl + TestRuns.fileName_packed, (err, response) => {
            if (err) {
                console.log(err);
                return;
            }
            console.log("start receiving and decompressing data... (starting timer)");

            let totalLength = response.headers['content-length'];
            console.log(totalLength);
            let totalParsed = 0;
            let timeStart = new Date().getTime();
            let entryID = 0;
            let stems = {};

            response.on('data', data => {
                totalParsed += data.length;
            });

            // unpack & feed into WARC parser
            let decompressed = Unpacker.decompressGZipStream(response);
            const WARCParser = new TestRuns.WARCStream();
            decompressed.pipe(WARCParser).on('data', data => {

                // getting WET entries here
                let p = new WebPage(data);
                let tld = p.getTLD();

                //Check if page is in english
                LanguageExtractor.isWebPageInLanguage(p, 'en', function(result : boolean) {
                    if(!result) {
                        return;
                    }
                    //Add stems to total stem-list
                    WordPreprocessor.processToTotal(p.content, stems, p);

                    // print only a few entries
                    if (entryID % 20 == 0) {
                        let duration = new Date().getTime() -  timeStart;
                        console.log("entry #" + entryID
                            + "  \tProgress: " + ((100 * totalParsed) / totalLength).toFixed(2) + "%"
                            + "   \tTLD: " + tld
                            + " \t\ttime passed: " + duration + " ms"
                            + "\t\tavg time per entry: " + Math.round(duration / (entryID+1) * 1000) / 1000 + "ms"
                            + " \t\tURI: " + p.getURI()
                        );
                    }
                    entryID++;
                });
            }).on('end', () => {
                let durationUntilTermSearch = new Date().getTime() - timeStart;
                //All documents for this file have been parsed, now match terms to stems
                console.log('Now looking for matches with the search terms..');
                let pageList = TermSearch.searchTermsInStemMap(stems);
                console.log('Results:');
                for(let i = 0; i < pageList.length; i++) {
                    console.log('\'' + pageList[i].match + '\': ' + pageList[i].getURI());
                }
                let durationUntilEnd = new Date().getTime() - timeStart;

                console.log('Finished. Took ' + durationUntilTermSearch + 'ms for parsing and downloading pages' +
                    ' and ' + durationUntilEnd + 'ms in total');
            });
        });
    }


}
