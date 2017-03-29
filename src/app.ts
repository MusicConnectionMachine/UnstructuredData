// TEST RUNS
// Don't run multiple runs simultaneously!
import {TestRuns} from "./test-runs";

//Test storer
//TestRuns.testStorer();

// test cc index
//TestRuns.testCCIndex();


// UNIT TESTS
import {PrefixTreeTest} from "./tests/test-prefix-tree";
import {NaiveTermSearchTest} from "./tests/test-term-search-naive";

PrefixTreeTest.runAllTests();
NaiveTermSearchTest.runAllTests();
