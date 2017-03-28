import "mocha";
import { Occurrence } from "../../utils/occurrence";
let assert = require("chai").assert;

describe("Occurrence", () => {
    it("should convert a occurrence map into an array of occurrences .occurrenceMapToArray()", () => {
        let occurrenceMap = new Map();
        occurrenceMap.set("test", [1, 42]);
        occurrenceMap.set("random", [69]);
        let occurrenceArray = [];
        occurrenceArray.push({term: "test", positions: [1, 42]});
        occurrenceArray.push({term: "random", positions: [69]});
        assert.deepEqual(occurrenceArray, Occurrence.occurrenceMapToArray(occurrenceMap));
    });
    it("should convert a an array of occurrences into a map .occurrenceArrayToMap()", () => {
        let occurrenceMap = new Map();
        occurrenceMap.set("test", [1, 42]);
        occurrenceMap.set("random", [69]);
        let occurrenceArray = [];
        occurrenceArray.push(new Occurrence("test", [1, 42]));
        occurrenceArray.push(new Occurrence("random", [69]));
        assert.deepEqual(occurrenceMap, Occurrence.occurrenceArrayToMap(occurrenceArray));
    });
    it(".occurrenceMapToArray() should be inverse to .occurrenceArrayToMap()", () => {
        let occurrenceArray = [];
        occurrenceArray.push(new Occurrence("test", [1, 42]));
        occurrenceArray.push(new Occurrence("random", [69]));
        let occurrenceMap = Occurrence.occurrenceArrayToMap(occurrenceArray);
        assert.deepEqual(occurrenceArray, Occurrence.occurrenceMapToArray(occurrenceMap));
    })
});