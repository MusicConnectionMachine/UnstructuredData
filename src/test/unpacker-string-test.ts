import "mocha";
import {Unpacker} from "../unpacker";
let assert = require("chai").assert;

describe("Unpacker: string async", () => {
    it("decompress is inverse of compress", (done) => {

        let testString = "lalalalala123455";
        for (let i = 0; i < 100; i++) testString += Math.random(); // add some characters

        Unpacker.compressStringToBuffer(testString, (err, compressed) => {
            if (err) {
                assert.isTrue(false, "err in compressStringToBuffer");
                done();
                return;
            }
            Unpacker.decompressBufferToString(compressed, (err, decompressed) => {
                if (err) {
                    assert.isTrue(false, "err in decompressBufferToString");
                    done();
                    return;
                }

                assert.equal(testString, decompressed);
                done();

            });
        });

    });
});