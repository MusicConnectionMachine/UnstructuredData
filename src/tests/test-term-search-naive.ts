import { TermSearch } from "../term-search";


export class NaiveTermSearchTest {

    /**
     * Some hardcoded tests for the TermSearch.searchTermsInString(...)
     */
    public static runAllTests() : void {

        let searchString : string = "aabbccddAABBCCDD";
        let terms = ["aa", "bb", "bCcD", "A"];
        let caseSensitive = false;

        let occs = TermSearch.searchTermsInString(searchString, terms, caseSensitive);
        for (let occ of occs) {
            let expected : string;
            let result = JSON.stringify(occ.positions);

            if ( occ.term == "aa") expected = JSON.stringify( [0, 8] );
            if ( occ.term == "bb" ) expected = JSON.stringify( [2, 10] );
            if ( occ.term == "bCcD" ) expected = JSON.stringify( [3, 11] );
            if ( occ.term == "A" ) expected = JSON.stringify( [0, 1, 8, 9] );

            if (result !== expected) {
                console.error("[FAILED]  runAllTests (not case sensitive) fails for " + occ.term +
                    "\t\t> exptected: " + expected + "; got: " + result);
            } else {
                console.log("[PASSED]  runAllTests (not case sensitive) works for " + occ.term +
                    "\t\t> exptected: " + expected + "; got: " + result);
            }
        }

        caseSensitive = true;
        occs = TermSearch.searchTermsInString(searchString, terms, caseSensitive);
        for (let occ of occs) {
            let expected : string;
            let result = JSON.stringify(occ.positions);

            if ( occ.term == "aa") expected = JSON.stringify( [0] );
            if ( occ.term == "bb" ) expected = JSON.stringify( [2] );
            if ( occ.term == "A" ) expected = JSON.stringify( [8, 9] );

            if (result !== expected) {
                console.error("[FAILED]  runAllTests (case sensitive) fails for " + occ.term +
                    "\t\t> exptected: " + expected + "; got: " + result);
            } else {
                console.log("[PASSED]  runAllTests (case sensitive) works for " + occ.term +
                    "\t\t> exptected: " + expected + "; got: " + result);
            }

            if ( occ.term == "bCcD" ) {
                console.error("[FAILED]  runAllTests fails for " + occ.term +
                    "\t\t> No occurrence object should be created for this term!");

            }
        }
    }


}
