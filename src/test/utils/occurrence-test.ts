import "mocha";
import {Occurrence} from "../../utils/occurrence";
import {Term} from "../../utils/term";
let assert = require("chai").assert;

describe("Occurrence", () => {
    it("should work: arrayToMap and mapToArray", () => {
        let occ1 = new Occurrence(new Term("term1", "1"), [42]);
        let occ2 = new Occurrence(new Term("term2", "2"), [43]);
        let occ3 = new Occurrence(new Term("term3", "3"), [44]);
        let occArrExpected = [occ1, occ2, occ3];

        let occMapResult = Occurrence.occArrayToMap(occArrExpected);
        let occArrResult = Occurrence.occMapToArr(occMapResult);

        // deepEqual is not working on Maps: returns OK even if two maps are obviously different
        assert.isTrue(JSON.stringify(occMapResult.get("term1")) == JSON.stringify(["1", [42]]));
        assert.isTrue(JSON.stringify(occMapResult.get("term2")) == JSON.stringify(["2", [43]]));
        assert.isTrue(JSON.stringify(occMapResult.get("term3")) == JSON.stringify(["3", [44]]));
        assert.isTrue(JSON.stringify(occArrExpected) == JSON.stringify(occArrResult));

        // test false
        assert.isFalse(JSON.stringify(occMapResult.get("term2")) == JSON.stringify(["3", [44]]));
        assert.isFalse(JSON.stringify(occMapResult.get("term3")) == JSON.stringify(["2", [43]]));
        assert.isFalse(JSON.stringify(occMapResult.get("term1")) == JSON.stringify(["3", [44]]));

    });

});