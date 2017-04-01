import "mocha";
import {IndexFilterResult} from "../../utils/index-filter-result";
let assert = require("chai").assert;

describe("IndexFilterResult ifrMapToArray & ifrArrayToMap", () => {
    it("should convert a occurrence map into an array of occurrences .ifrMapToArray()", () => {
        let occurrenceMap = new Map();
        occurrenceMap.set("test", [1, 42]);
        occurrenceMap.set("random", [69]);
        let occurrenceArray = [];
        occurrenceArray.push(new IndexFilterResult("test", [1, 42]));
        occurrenceArray.push(new IndexFilterResult("random", [69]));
        assert.deepEqual(occurrenceArray, IndexFilterResult.ifrMapToArray(occurrenceMap));
    });
    it("should convert a an array of occurrences into a map .ifrArrayToMap()", () => {
        let occurrenceMap = new Map();
        occurrenceMap.set("test", [1, 42]);
        occurrenceMap.set("random", [69]);
        let occurrenceArray = [];
        occurrenceArray.push(new IndexFilterResult("test", [1, 42]));
        occurrenceArray.push(new IndexFilterResult("random", [69]));
        assert.deepEqual(occurrenceMap, IndexFilterResult.ifrArrayToMap(occurrenceArray));
    });
    it(".ifrMapToArray() should be inverse to .ifrArrayToMap()", () => {
        let occurrenceArray = [];
        occurrenceArray.push(new IndexFilterResult("test", [1, 42]));
        occurrenceArray.push(new IndexFilterResult("random", [69]));
        let occurrenceMap = IndexFilterResult.ifrArrayToMap(occurrenceArray);
        assert.deepEqual(occurrenceArray, IndexFilterResult.ifrMapToArray(occurrenceMap));
    })
});