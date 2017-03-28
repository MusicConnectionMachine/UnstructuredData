import "mocha";
import { Filter } from "../../filters/filter";
import { BloomFilter } from "../../filters/bloom-filter";
import { PrefixTree } from "../../filters/prefix-tree";
import { NaiveFilter } from "../../filters/naive-filter";
let assert = require("chai").assert;


testFilter(BloomFilter);
testFilter(PrefixTree);
testFilter(NaiveFilter);

function testFilter<T extends Filter> (filterConstructor : new () => T) {
    let filter : T;
    let filterName = new filterConstructor().constructor.name;

    describe("Filter: " + filterName, () => {
        it("should have a match .hasMatch()", () => {
            filter = new filterConstructor();
            let searchTerms = ['test', 'some', 'random', 'words'];
            let text = 'This is a not so long text which should contain some words.';
            filter.addSearchTerms(searchTerms);
            let result = filter.hasMatch(text);
            assert.strictEqual(result, true);
        });
        it("should not have a match .hasMatch()", () => {
            filter = new filterConstructor();
            let searchTerms = ['test', 'sometimes', 'random'];
            let text = 'This is a not so long text which should contain some words.';
            filter.addSearchTerms(searchTerms);
            let result = filter.hasMatch(text);
            assert.strictEqual(result, false);
        });
        it("should have at least one match, pre- and suffixes might match .getMatches()", () => {
            filter = new filterConstructor();
            let searchTerms = ['test', 'some', 'random', 'words'];
            let text = 'Sometimes I wonder what I am doing here with all these random tests...';
            filter.addSearchTerms(searchTerms);
            let result = filter.getMatches(text);
            assert.ok(result.size > 0);
        });
        it("should only have one match .getMatches()", () => {
            filter = new filterConstructor();
            let searchTerms = ['test', 'some', 'random', 'words'];
            let text = 'There are a not so many words here... Well, let\'s add a few more, just to be sure. ' +
                'It should only have one match though!';
            filter.addSearchTerms(searchTerms);
            let result = filter.getMatches(text);
            let expectedResult = new Set(['words']);
            assert.deepEqual(result, expectedResult);
        })
    });
}

