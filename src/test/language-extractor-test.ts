import "mocha";
import {LanguageExtractor} from "../language-extractor";
import {WebPage} from "../classes/webpage";
let assert = require("chai").assert;

function createDummyWebPage() : WebPage {
    let webPage = new WebPage();
    webPage.content = "I am not very creative when writing these tests, like not at all. " +
        "I should probably add some terms in this text otherwise this test is useless...";
    webPage.headers = {"WARC-Target-URI": "https://test.com"};
    return webPage;
}

describe("LanguageExtractor", () => {
    it("should create sample text with the specified length", () => {
        let webPage = createDummyWebPage();
        let result = LanguageExtractor.getTestSample(webPage, 17);
        assert.ok(result.length === 17);
    });
    it("should throw an error if language code isn't ISO 639-1 conform", () => {
        try {
            new LanguageExtractor(new Set(["eng"]));
            assert.fail();
        } catch (err) {
            assert.isDefined(err);
        }
    });
    it("should return ISO 639-1 conform language code", (done) => {
        let webPage = createDummyWebPage();
        LanguageExtractor.getPageLanguage(webPage, (result) => {
            assert.equal(result, "en");
            done();
        });
    });
    it("should match the page", (done) => {
        let webPage = createDummyWebPage;
        new LanguageExtractor(new Set(["en"])).matches(webPage(), result => {
            assert.strictEqual(result, true);
            done();
        });
    });
});

