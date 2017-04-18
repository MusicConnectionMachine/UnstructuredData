import "mocha";
import { Filter } from "../../filters/filter";
import { BloomFilter } from "../../filters/bloom-filter";
import { PrefixTree } from "../../filters/prefix-tree";
let assert = require("chai").assert;


testFilter(BloomFilter);
testFilter(PrefixTree);

function testFilter<T extends Filter> (filterConstructor : new (searchTerms? : Set<string>) => T) {
    let filter : T;
    let filterName = new filterConstructor().constructor.name;

    describe("Filter: " + filterName, () => {
        it("should have a match .hasMatch()", () => {
            let searchTerms = ['test', 'some', 'random', 'words'];
            let text = 'This is a not so long text which should contain some words.';
            filter = new filterConstructor(new Set(searchTerms));
            let result = filter.hasMatch(text);
            assert.strictEqual(result, true);
        });
        it("should not have a match .hasMatch()", () => {
            let searchTerms = ['test', 'sometimes', 'random'];
            let text = 'This is a not so long text which should contain some words.';
            filter = new filterConstructor(new Set(searchTerms));
            let result = filter.hasMatch(text);
            assert.strictEqual(result, false);
        });
        it("should be case sensitive .hasMatch()", () => {
            let searchTerms = ['Not', 'random', 'words'];
            let text = 'There are a not so many WORDS here';
            filter = new filterConstructor(new Set(searchTerms));
            let result = filter.hasMatch(text);
            assert.strictEqual(result, false);
        });
    });
}

