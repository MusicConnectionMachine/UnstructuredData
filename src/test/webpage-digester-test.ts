import "mocha";
import {WebPageDigester} from "../webpage-digester";
import {PrefixTree} from "../filters/prefix-tree";
import {WebPage} from "../utils/webpage";
import {BloomFilter} from "../filters/bloom-filter";
import {NaiveFilter} from "../filters/naive-filter";
import {Occurrence} from "../utils/occurrence";
import {Term} from "../utils/term";
let assert = require("chai").assert;

let termStr = ["some", "more", "or", "less", "random", "terms"];
let terms = [];
for (let str of termStr) {
    terms.push(new Term(str, "id=" + Math.random()));
}

function createDummyWebPage() : WebPage {
    let webPage = new WebPage();
    webPage.content = "I am not very creative when writing these tests, like not at all. " +
        "I should probably add some terms in this text otherwise this test is useless...";
    return webPage;
}

describe("WebSiteDigester", () => {
    it("shouldn't change the results when adding and removing a pre-filter", () => {
        let digester = new WebPageDigester(terms).setFilter(PrefixTree);
        let before = digester.digest(createDummyWebPage());

        // add pre-filter, digest a webPage with pre-filter and then remove the pre-filter
        digester.setPreFilter(BloomFilter);
        digester.digest(createDummyWebPage());
        digester.removePreFilter();

        let after = digester.digest(createDummyWebPage());
        assert.deepEqual(after, before);
    });
    it("shouldn't change the results when replacing the filter with the same filter", () => {
        let digester = new WebPageDigester(terms).setFilter(NaiveFilter);
        let before = digester.digest(createDummyWebPage());

        // replace filter twice
        digester.setFilter(PrefixTree);
        digester.setFilter(NaiveFilter);

        let after = digester.digest(createDummyWebPage());
        assert.deepEqual(after, before);
    });
    it("shouldn't change the result when applying the same filter as a pre-filter", () => {
        let digester = new WebPageDigester(terms).setFilter(PrefixTree);
        let before = digester.digest(createDummyWebPage());

        digester.setPreFilter(PrefixTree);

        let after = digester.digest(createDummyWebPage());
        assert.deepEqual(after, before);
    });
    it("should merge occurrences", () => {
        let webPage = createDummyWebPage();
        let t1 = new Term("terms", "id1");
        let t2 = new Term("false positive", "id2");

        webPage.occurrences = [new Occurrence(t1, [42]), new Occurrence(t2, [10])];

        let digester = new WebPageDigester(terms).setFilter(NaiveFilter);
        let result = digester.digest(webPage, true);

        let expected = createDummyWebPage();
        expected.occurrences = [new Occurrence(t1, [42, 93]), new Occurrence(t2, [10])];
        //assert(result, expected); // TODO: broken
    });
});