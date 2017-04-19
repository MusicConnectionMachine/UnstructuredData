import "mocha";
import { IndexFilter } from "../../filters/index-filter";
import { PrefixTree } from "../../filters/prefix-tree";
import {Term} from "../../utils/term";
import {Occurrence} from "../../utils/occurrence";
let assert = require("chai").assert;


testFilter(PrefixTree);

function testFilter<T extends IndexFilter> (filterConstructor : new (searchTerms? : Array<Term>) => T) {
    let filter : T;
    let filterName = new filterConstructor().constructor.name;

    describe("IndexFilter: " + filterName, () => {
        it("should have at least one match, pre- and suffixes are allowed .getMatchesIndex()", () => {
            let searchTerms = generateTerms(['test', 'some', 'random', 'words']);
            let text = 'Sometimes I wonder what I am doing here with all these random tests...';
            filter = new filterConstructor(searchTerms);
            let result = filter.getMatches(text);
            assert.ok(result.length > 0);
        });
        it("should only have one match .getMatchesIndex()", () => {
            let searchTerms = generateTerms(['test', 'some', 'random', 'words']);
            let text = 'There are a not so many words here... Well, let\'s add a few more, just to be sure. ' +
                'It should only have one match though!';
            filter = new filterConstructor(searchTerms);
            let result = filter.getMatches(text);
            let expectedResult = [new Occurrence(searchTerms[3],[24])];
            assert.deepEqual(result, expectedResult);
        });
        it("should be case sensitive .getMatchesIndex()", () => {
            let searchTerms = generateTerms(['Not', 'random', 'words', 'WORDS']);
            let text = 'There are a not so many WORDS here';
            filter = new filterConstructor(searchTerms);
            let result = filter.getMatches(text);
            let expectedResult = [new Occurrence(searchTerms[3],[24])];
            assert.deepEqual(result, expectedResult);
        });
        it("should find the correct match", () => {
            let searchTerm = generateTerms(["cello", "cello concerto no. 6 in g major"]);
            let text = "cellos are instruments.";
            filter = new filterConstructor(searchTerm);
            let result = filter.getMatches(text);
            assert.deepEqual(result, [new Occurrence(new Term("cello", "0"), [0])]);
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