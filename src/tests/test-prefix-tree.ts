import {PrefixTree} from "../filters/prefix-tree";

export class PrefixTreeTest {

    public static runAllTests() {
        PrefixTreeTest.basicTests();
        PrefixTreeTest.termSetsOnOneString();
        PrefixTreeTest.insertionTests();
    }

    private static basicTests() {
        let terms = [
            'a', 'bcd'
        ];

        let pTree = new PrefixTree(terms);

        let matchingStrings = [
            "Axxx", "xxxBCDxxx", "xAAAAxx",  "xxxBCD", "sljövma43ru538thjöo8gahvöoasrh", "bbbbcccddddbcd"
        ];

        for (let i = 0; i < matchingStrings.length; i++) {
            let matched = pTree.filterText(matchingStrings[i]);
            let status = matched ? "[PASSED] " : "[FAILED]";
            console.log(status + " matching string '" + matchingStrings[i] + "' with " + pTree);
        }

        let notMatchingString = [
            "", "wtf", "bbbbbbbbbbbbbb", "owesoooome!!!11"
        ];


        for (let i = 0; i < notMatchingString.length; i++) {
            let matched = pTree.filterText(notMatchingString[i]);
            let status = !matched ? "[PASSED] " : "[FAILED]";
            console.log(status + " NOT matching string '" + notMatchingString[i] + "'");
        }

    }

    private static termSetsOnOneString() {

        let string = "Some not so random text I didn't came up with...";

        let matchingTermSets = [
            ["so", "totally", "not", "random", "at", "all"],
            ["some"],
            ["random"],
            ["r"],
            ["om text I didn't c"],
            ["some", "soda", "soap"]
        ];

        let notMatchingTermSets = [
            ["wtf"],
            ["nott", "rrandom"],
            [],
            ["Some not so random text I didn't came up with...."], // note the last '.'
            ["aa", "bb", "asgdfsg", "dfgdfg", "    fg fg ear+++"],
            ["mozart", "\n", "\t"]
        ];

        for (let matchingSet of matchingTermSets) {
            let pTree = new PrefixTree(matchingSet);
            let matched = pTree.filterText(string);
            let status = matched ? "[PASSED] " : "[FAILED]";
            console.log(status + " matching string with this tree: " + pTree);
        }

        for (let notMatchingSet of notMatchingTermSets) {
            let pTree = new PrefixTree(notMatchingSet);
            let matched = pTree.filterText(string);
            let status = !matched ? "[PASSED] " : "[FAILED]";
            console.log(status + " NOT matching string with this tree: " + pTree.toString().replace('\n', ''));
        }



    }

    private static insertionTests() {

        let string = "xxxmozartxxx";

        let pTree = new PrefixTree(); // empty tree
        pTree.addSearchTerm("mozartWasHere");
        let matched = pTree.filterText(string);
        let status = !matched ? "[PASSED] " : "[FAILED]";
        console.log(status + " NOT matching '" + string +  "' with this tree: " + pTree);

        // insert a shorter string -> replace tho old long one
        pTree.addSearchTerm("mozart");
        matched = pTree.filterText(string);
        status = matched ? "[PASSED] " : "[FAILED]";
        console.log(status + " matching '" + string +  "' with this tree: " + pTree );

        // adding a longer term, should be ignored
        let treeString = pTree.toString();
        pTree.addSearchTerm("mozartWasHere");
        status = (pTree.toString() == treeString ) ? "[PASSED] " : "[FAILED]";
        console.log(status + " longer terms do not replace short ones" );

    }

}
