import "mocha";
import {LanguageExtractor} from "../language-extractor";
import {WebPage} from "../utils/webpage";
let assert = require("chai").assert;

function createDummyWebPage() : WebPage {
    let webPage = new WebPage();
    webPage.content = "I am not very creative when writing these tests, like not at all. " +
        "I should probably add some terms in this text otherwise this test is useless...";
    return webPage;
}

describe("LanguageExtractor", () => {
    it("should create sample text with the specified length", () => {
        let webPage = createDummyWebPage();
        let result = LanguageExtractor.getTestSample(webPage, 17);
        assert.ok(result.length === 17);
    });
});

