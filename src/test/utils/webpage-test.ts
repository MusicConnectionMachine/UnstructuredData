import "mocha";
import {WebPage} from "../../utils/webpage";
import {Occurrence} from "../../utils/occurrence";
let assert = require("chai").assert;

function generateDummyWARC(url : string) {
    return {
        protocol: "WARC/1.0",
        headers: {
            "WARC-Type": "conversion",
            "WARC-Target-URI": url
        },
        content: new Buffer("Some sample text, yay!")
    };
}

describe("WebPage", () => {
    it("should assemble a WebPage into WARC string correctly", () => {
        let expected = "WARC/1.0" +
            "\nWARC-Type: conversion" +
            "\nWARC-Target-URI: https://host.com/a/path.html" +
            "\n\nSome sample text, yay!" +
            "\n\n";
        assert.strictEqual(new WebPage(generateDummyWARC("https://host.com/a/path.html")).toWARCString(), expected);
    });
    it("should return empty string as TLD of IPv4 address", () => {
        let webPage = new WebPage(generateDummyWARC("https://127.0.0.1/a/path.html"));
        assert.strictEqual(webPage.getTLD(), "");
    });
    it("should return empty string as TLD of IPv6 address", () => {
        let webPage = new WebPage(generateDummyWARC("https://42fa:eab6::1/a/path.html"));
        assert.strictEqual(webPage.getTLD(), "");
    });
    it("should return the correct TLD", () => {
        let webPage = new WebPage(generateDummyWARC("https://this.host.has.sub.domains.co.uk/meh"));
        assert.strictEqual(webPage.getTLD(), "uk");
    });
    it("should merge occurrences correctly", () => {
        let webPage = new WebPage(generateDummyWARC(""));
        webPage.occurrences = [new Occurrence("terms", [42]), new Occurrence("false positive", [10])];
        webPage.mergeOccurrences([new Occurrence("terms", [42, 93])]);

        let expected = [new Occurrence("terms", [42, 93]), new Occurrence("false positive", [10])];
        assert.deepEqual(webPage.occurrences, expected);
    });
    it("should merge occurrences correctly when this.occurrences is an empty Array", () => {
        let webPage = new WebPage(generateDummyWARC(""));
        webPage.mergeOccurrences([new Occurrence("terms", [42, 69])]);
        assert.deepEqual(webPage.occurrences, [new Occurrence("terms", [42, 69])]);
    });
});