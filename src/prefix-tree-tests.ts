import {PrefixTree} from "./prefix-tree";

export class PrefixTreeTest {

    public static test() {
        let terms = [
            'a', 'bcd'
        ];

        let pTree = new PrefixTree(terms);

        console.log("Using tree: " + pTree + "\n");

        let matchingStrings = [
            "Axxx", "xxxBCDxxx", "xAAAAxx",  "xxxBCD", "sljövma43ru538thjöo8gahvöoasrh", "bbbbcccddddbcd"
        ];

        for (let i = 0; i < matchingStrings.length; i++) {
            let matched = pTree.matchAtLeastOneTerm(matchingStrings[i]);
            let status = matched ? "[PASSED] " : "[FAILED]";
            console.log(status + " matching string '" + matchingStrings[i] + "'");
        }

        let notMatchingString = [
            "", "wtf", "bbbbbbbbbbbbbb", "owesoooome!!!11"
        ];


        for (let i = 0; i < notMatchingString.length; i++) {
            let matched = pTree.matchAtLeastOneTerm(notMatchingString[i]);
            let status = !matched ? "[PASSED] " : "[FAILED]";
            console.log(status + " NOT matching string '" + notMatchingString[i] + "'");
        }


    }
}
