import {LanguageExtractor} from "../language-extractor";
import {Downloader} from "../downloader";
import {Unpacker} from "../unpacker";
import {CCIndex} from "../cc-index";
import {WetManager} from "../wet-manager";
import {TermLoader} from "../utils/term-loader";
import {WebPage} from "../utils/web-page";
import {Occurrence} from "../utils/occurrence";
import {PrefixTree} from "../filters/prefix-tree";


/**
 * Contains a few runs that generate sample data
 */
export class SampleDataGenerator {

    static fs = require('fs');
    static path = require('path');
    static WARCStream = require('warc');

    static dataFolder = './data/';


    //Feb 17 Crawl data which contains https://www.britannica.com/topic/Chaconne-by-Bach
    static crawlBaseUrl = 'https://commoncrawl.s3.amazonaws.com/crawl-data/CC-MAIN-2017-09/segments/1487501172017.60/wet/';
    static fileName_packed = 'CC-MAIN-20170219104612-00150-ip-10-171-10-108.ec2.internal.warc.wet.gz';
    static fileName_unpacked = 'CC-MAIN-20170219104612-00150-ip-10-171-10-108.ec2.internal.warc.wet';


    public static createFilteredSampleDataForGroups3_4() {
        console.log("Creating sample data for groups 3 & 4");
        console.log("Sending request... ");

        // some hardcoded composers here
        let terms = TermLoader.loadDummyTerms();
        let filter = new PrefixTree(terms);
        let outputFile = SampleDataGenerator.dataFolder + SampleDataGenerator.fileName_unpacked + "_filtered";
        const writeStream = LanguageExtractor.fs.createWriteStream(outputFile, {flags: 'w'});
        let pagesFound = 0;

        Downloader.getResponse(
            SampleDataGenerator.crawlBaseUrl + SampleDataGenerator.fileName_packed, (err, response) => {
                if (err) {
                    console.log(err);
                    return;
                }

                // unpack & feed into WARC parser
                let decompressed = Unpacker.decompressGZipStream(response);
                const WARCParser = new SampleDataGenerator.WARCStream();
                decompressed.pipe(WARCParser).on('data', data => {

                    // getting WET entries here
                    let p = new WebPage(data);

                    //Check if page is in english
                    LanguageExtractor.isWebPageInLanguage(p, LanguageExtractor.ENGLISH_LANG_CODE, function (result: boolean) {
                        if (!result)  return;

                        // search for terms
                        let totalOccs = 0;
                        let distinctOccs = 0;
                        let occs : Array<Occurrence> = filter.getMatchesIndex(p.content);
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

    /**
     * Extract all english pages from a file and write them into another.
     */
    public static testExtractAllEnglishPages() {
        try {
            SampleDataGenerator.fs.mkdirSync(SampleDataGenerator.dataFolder);
        } catch(e) {
            if (e.code != 'EEXIST') { throw e; }
        }

        // THE DATA FILE IS ALREADY DOWNLOADED AND UNPACKED
        const filepath = SampleDataGenerator.dataFolder + SampleDataGenerator.fileName_unpacked;

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



    /**
     * Resolves relevant Wiki URLs to WET file paths.
     * Afterwards opens each WET file and scans for relevant pages.
     * All relevant pages are saved into a file (one file for each WET file).
     *
     * Possible improvements & fixes:
     *  - Send N requests simultaneously
     *  - Add timeout to the WET processing phase:
     *    if processing takes M or more minutes (probably error) -> start with the next file
     *
     * Warning: CC index API is slow! You can do following:
     *  - On the first run resolve the first 100-200 URLs and terminate the process
     *  - WET paths have a backup on disk, so don't worry.
     *  - Set "startResolvingFrom" to 99999 for the second run
     *  - This will resolve the last URL and start processing with WET files
     *  - One a WET file is processed, you can safely terminate the process (results are already on the disk)
     *  - Set "startWETProcessingFrom" to a value n > 0 to ignore the first n WET files
     */
    public static extractPagesByURL() {

        // options for URL resolving
        const urls = JSON.parse(SampleDataGenerator.fs.readFileSync("./urls/wikiURLs.json", "utf8"));
        const takeOnlyTheFirstWetPath = true;
        const cacheFile = "./urls/previouslyResolvedWETs.json";
        const saveAfter = 5;
        const startResolvingFrom = 0;           // set it to 0 for the first run!
                                                // set it to 9999999 to resolve the last and immediately start loading WET files
                                                // assumes that cacheFile was already populated in previous runs
        const maxTimeout = 7000;
        const ccIndex = "http://index.commoncrawl.org/CC-MAIN-2017-09-index"; // optional

        // options for WET processing
        const startWETProcessingFrom = 0;       // set it to 0 for the first run!
        // set it to n > 0 to ignore the first n WET files in the list
        // assumes that you have already processed some WET files and you don't want to do that again



        CCIndex.getWETPathsForEachURLStepByStep(urls, takeOnlyTheFirstWetPath, cacheFile, saveAfter, (wetPaths) => {
            //console.log("Finished! Following WETs are relevant:\n", wetPaths);

            console.log("------------------------");
            console.log("Finished resolving URLs!");
            console.log("WET files required: " + wetPaths.length);
            console.log("------------------------\n");

            function processWET(index) {
                if (index >= wetPaths.length) {
                    console.log("FINISHED!");
                    return;
                }

                let wetPath = wetPaths[index];
                console.log("[" + (index + 1) + "/" + wetPaths.length + "]   start processing new WET");
                console.log("now is " + (new Date).toString());
                console.log("getting " + wetPath);

                WetManager.loadWetAsStream(wetPath, (err, stream) => {
                    if (err) {
                        console.log("   error: " + err.message);
                        return;
                    }

                    let outputFileName = SampleDataGenerator.path.basename(wetPath).replace(".warc.wet.gz", ".filtered.warc.wet");
                    outputFileName = "file_" + ("0000" + (index+1)).slice(-4) + "_of_" + wetPaths.length + "_" + outputFileName;

                    let outputFilePath = SampleDataGenerator.path.join(SampleDataGenerator.dataFolder, outputFileName);
                    const writeStream = LanguageExtractor.fs.createWriteStream(outputFilePath, {flags: 'w'});


                    let entryID = 0;
                    let foundPages = 0;


                    // our input data might have partially encoded uris -> decode & encode again before comparison
                    function formatURI(uri) {
                        try {
                            let result = encodeURIComponent(decodeURIComponent(uri.toLowerCase())).toLowerCase().replace("https://", "").replace("http://", "");
                            return result;
                        } catch (e) {
                            // some URIs fail, return as is
                            //console.log("   strange uri: " + uri);
                            return uri;
                        }
                    }
                    // format each url only once
                    let urlsFormatted = [];
                    for (let url of urls) {
                        urlsFormatted.push(formatURI(url));
                    }


                    let warcParser = new SampleDataGenerator.WARCStream();
                    stream.pipe(warcParser).on('data', data => {

                        // getting WET entries here
                        let p = new WebPage(data);

                        if (entryID == 1 || entryID == 10 || entryID == 100 || (entryID > 0 && entryID % 1000 == 0)) {
                            console.log("       processing entry " + entryID + "\t\tURL: " + p.getURI());
                        }
                        entryID++;




                        let formattedPageURI = formatURI(p.getURI());

                        // compare with ALL relevant URLs
                        // this is quite slow, especially with URL formatting!
                        // If you are sure that the input URLs are formatted the sam way as CC is, remove the format() call
                        for (let urlF of urlsFormatted) {
                            if (formattedPageURI.includes(urlF)) {
                                // write page to file
                                foundPages++;
                                console.log("   :)  found relevant page: " + p.getURI());
                                writeStream.write(p.toString());
                                return;
                            }
                        }

                    }).on('end', () => {
                        console.log("   finished with " + wetPath );
                        console.log("   checked " + entryID + " pages");
                        console.log("   found " + foundPages + " relevant pages");
                        console.log("   filtered results were saved to " + outputFilePath + "\n");
                        writeStream.end();

                        // go for the next WET file
                        processWET(index+1);
                    });

                });

            }

            processWET(startWETProcessingFrom);


        }, startResolvingFrom, maxTimeout, ccIndex);

    }



}