/**
 * This is an implementation of a trie/prefix tree. It is used to efficiently search for a large number of different
 * terms in large strings. The search is not case sensitive.
 * Expected runtime: O(N * M) where N is the length of the string and M is the length of the longest term.
 *
 * >>>>>>>>>> WARNING, special case: term A is a prefix of term B. <<<<<<<<<<
 * Example:     A = "mozart"
 *              B = "mozartOverlord2000"
 *              string = "xx_mozart_xx"
 *
 * Case 1:      tree.add(A);    tree.add(B);    (B overrides A)
 *              tree.matchAtLeastOneTerm(string) == false!  B is not inside the string!
 *
 * Case 2:      tree.add(B);    tree.add(A);    (A overrides B)
 *              tree.matchAtLeastOneTerm(string) == true!  A is inside the string
 *
 * Best practice: do not use terms that are a prefix of another term.
 *
 *
 * Yes, I'm aware that there are npm packages for similar things like https://www.npmjs.com/package/trie-prefix-tree.
 * However, we have to maximize performance and remove any overhead that third-party packages might have (to provide
 * more functionality that is not needed here).
 */
export class PrefixTree {
    private root : PTElement;

    constructor(terms? : string[]) {

        this.root = new PTNode(); // not a leaf! we do not match any string at the beginning!

        if (terms) { // add provided terms if any
            for (let term of terms) {
                this.addTermToTree(term);
            }
        }
    }


    public addTermToTree(term : string) {
        this.root = this.root.addTerm(term.toLowerCase());
    }


    public matchAtLeastOneTerm(searchString : string) : boolean {

        for (let position = 0; position < searchString.length; position++) {
            // try to match each position until one term is found
            let result = this.root.match(searchString, position);
            if (result) return true;
        }

        return false;
    }

    public toString() : string {
        return "PrefixTree: { " + this.root.toString() + " }";
    }


}

export interface PTElement {

    addTerm(term : string) : PTElement;

    match(searchStr : string, searchPos : number) : boolean;

}

/**
 * Leafs are created at positions in the PT where the added terms end and match everything.
 * When adding new terms to a leaf, it is replaced by a node that matches that terms.
 */
class PTLeaf implements PTElement {

    addTerm(term: string): PTElement {
        if (term.length == 0) return this; // already a leaf

        let node = new PTNode();
        node.addTerm(term);
        return node;
    }

    match(searchStr : string, searchPos : number): boolean {
        return true;
    }

    public toString() : string {
        return ".";
    }


}

class PTNode implements PTElement {

    addTerm(term: string): PTElement {
        if (term.length == 0) {
            // empty string as term -> create a leaf
            return new PTLeaf();
        }

        // term not empty -> take first char as key; everything else is the remainder
        let key = term.charAt(0).toLowerCase();
        let remainder = term.substring(1);


        if (this.hasOwnProperty(key)) {
            // same key already exists
            this[key] = this[key].addTerm(remainder);

        } else {
            // this key is new -> create a new element
            let element : PTElement = new PTNode();
            element = element.addTerm(remainder); // will create a leaf if remainder == ""
            this[key] = element;
        }

        return this;
    }

    match(searchStr : string, searchPos : number): boolean {
        let key = searchStr.charAt(searchPos).toLowerCase(); // no checks for string ending, reason: charAt returns "" if position is invalid anyway

        if (!this.hasOwnProperty(key))  return false; // no such key in this PT node -> no match

        let childNode = this[key]; // continue search in child node

        return childNode.match(searchStr, searchPos + 1);
    }


    public toString() : string {
        let result = "";
        for (let key in this) {
            result += key + "(" + this[key].toString() + "); ";
        }


        return result.substring(0, result.length - 2);
    }


}
