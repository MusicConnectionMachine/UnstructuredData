import "mocha";
import {Unpacker} from "../unpacker";
let assert = require("chai").assert;

describe("Unpacker: string sync", () => {
    it("decompress is inverse of compress", () => {
        let testString = "lalalalala123455";
        for (let i = 0; i < 100; i++) testString += Math.random(); // add some characters

        let compressed = Unpacker.compressStringSync(testString);
        let decompressed = Unpacker.decompressStringSync(compressed);

        assert.equal(testString, decompressed);
    });
});