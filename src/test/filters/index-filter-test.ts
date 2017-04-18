import "mocha";
import { IndexFilter } from "../../filters/index-filter";
import { PrefixTree } from "../../filters/prefix-tree";
import {IndexFilterResult} from "../../utils/index-filter-result";
let assert = require("chai").assert;


testFilter(PrefixTree);

function testFilter<T extends IndexFilter> (filterConstructor : new (searchTerms? : Set<string>) => T) {
    let filter : T;
    let filterName = new filterConstructor().constructor.name;

    describe("IndexFilter: " + filterName, () => {
        it("should have at least one match, pre- and suffixes are allowed .getMatchesIndex()", () => {
            let searchTerms = ['test', 'some', 'random', 'words'];
            let text = 'Sometimes I wonder what I am doing here with all these random tests...';
            filter = new filterConstructor(new Set(searchTerms));
            let result = filter.getMatches(text);
            assert.ok(result.length > 0);
        });
        it("should only have one match .getMatchesIndex()", () => {
            let searchTerms = ['test', 'some', 'random', 'words'];
            let text = 'There are a not so many words here... Well, let\'s add a few more, just to be sure. ' +
                'It should only have one match though!';
            filter = new filterConstructor(new Set(searchTerms));
            let result = filter.getMatches(text);
            let expectedResult = [new IndexFilterResult('words',[24])];
            assert.deepEqual(result, expectedResult);
        });
        it("should be case sensitive .getMatchesIndex()", () => {
            let searchTerms = ['Not', 'random', 'words', 'WORDS'];
            let text = 'There are a not so many WORDS here';
            filter = new filterConstructor(new Set(searchTerms));
            let result = filter.getMatches(text);
            let expectedResult = [new IndexFilterResult('WORDS',[24])];
            assert.deepEqual(result, expectedResult);
        });
    });
}

