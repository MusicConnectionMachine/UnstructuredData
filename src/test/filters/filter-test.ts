import "mocha";
import { Filter } from "../../filters/filter";
import { BloomFilter } from "../../filters/bloom-filter";
import { PrefixTree } from "../../filters/prefix-tree";
import {Term} from "../../utils/term";
let assert = require("chai").assert;


testFilter(BloomFilter);
testFilter(PrefixTree);

function testFilter<T extends Filter> (filterConstructor : new (searchTerms? : Array<Term>) => T) {
    let filter : T;
    let filterName = new filterConstructor().constructor.name;

    describe("Filter: " + filterName, () => {
        it("should have a match .hasMatch()", () => {
            let searchTerms = generateTerms(['test', 'some', 'random', 'words']);
            let text = 'This is a not so long text which should contain some words.';
            filter = new filterConstructor(searchTerms);
            let result = filter.hasMatch(text);
            assert.strictEqual(result, true);
        });
        it("should not have a match .hasMatch()", () => {
            let searchTerms = generateTerms(['test', 'sometimes', 'random']);
            let text = 'This is a not so long text which should contain some words.';
            filter = new filterConstructor(searchTerms);
            let result = filter.hasMatch(text);
            assert.strictEqual(result, false);
        });
        it("should be case sensitive .hasMatch()", () => {
            let searchTerms = generateTerms(['Not', 'random', 'words']);
            let text = 'There are a not so many WORDS here';
            filter = new filterConstructor(searchTerms);
            let result = filter.hasMatch(text);
            assert.strictEqual(result, false);
        });
    });
}

function generateTerms(words : Array<string>) {
    let terms : Array<Term> = [];
    for (let [index, word] of words.entries()) {
        terms.push(new Term(word, index.toString()));
    }
    return terms;
}

