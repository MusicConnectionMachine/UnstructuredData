import {TestRuns} from "./test-runs";
import {PrefixTreeTest} from "./prefix-tree-tests";

// don't run multiple test runs simultaneously!

// run one of these to download and save file
//TestRuns.testDownloadUnpackingAndStemming();
//TestRuns.testStreamedDownloadAndUnpacking();

// run this to download and process directly (no saving)
//TestRuns.testStreamedDownloadUnpackingAndProcessing();

// there runs assume that the file is already downloaded -> no waiting
//TestRuns.testTLD();
//TestRuns.testLanguageExtractor_super_slow();
//TestRuns.testPreProcessingChain();
//TestRuns.testExtractAllEnglishPages();
//TestRuns.createFilteredSampleDataForGroups3_4();

// other tests
//TestRuns.testTermSearch();

PrefixTreeTest.test();