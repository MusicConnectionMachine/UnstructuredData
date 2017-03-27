// TEST RUNS
// Don't run multiple runs simultaneously!
import {TestRuns} from "./test-runs";

// Run one of these to download and unpack file:
// TestRuns.downloadUnpack_sequential();
// TestRuns.downloadUnpack_streamed();


// Run one of these to create a new file with filtered data:
// TestRuns.testExtractAllEnglishPages();   // WET file must already be downloaded!
// TestRuns.createFilteredSampleDataForGroups3_4();
// TestRuns.getMozartFromWiki();


// These runs require the WET file to be already downloaded and unpacked:
// TestRuns.testTLD();
// TestRuns.testLanguageExtractor();
// TestRuns.testPreProcessingChain();

//Testing of WetManager
//TestRuns.testWetManager();


// Most advanced test run so far:
//TestRuns.testStreamedDownloadUnpackingAndProcessing();

// UNIT TESTS
//import {PrefixTreeTest} from "./tests/test-prefix-tree";
//import {NaiveTermSearchTest} from "./tests/test-term-search-naive";

//PrefixTreeTest.runAllTests();
// NaiveTermSearchTest.runAllTests();

// FILTER TESTS
import { BloomFilter } from "./filters/bloom-filter";
import { PrefixTree } from "./filters/prefix-tree";

TestRuns.testFilter(new BloomFilter());
TestRuns.testFilter(new PrefixTree());