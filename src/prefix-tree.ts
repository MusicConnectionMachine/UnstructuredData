/**
 * This is an implementation of a trie/prefix tree. It is used to efficiently search for a large number of different
 * terms in large strings. The search is not case sensitive.
 * Expected runtime: O(N * M) where N is the length of the string and M is the length of the longest term.
 *
 * Special case: term A is a prefix of term B.
 * In this case B will not be added to the tree.
 * Reason: A would be replaced by B
 *
 *
 * I'm aware that there are npm packages for similar things like https://www.npmjs.com/package/trie-prefix-tree.
 * However, we have to maximize performance and remove any overhead that third-party packages might have (to provide
 * more functionality that is not needed here).
 */
export class PrefixTree {
    private root : PTElement;

    /**
     * Create a PrefixTree and add initialize it with a set of terms (optional).
     * @param terms
     */
    constructor(terms? : string[]) {
        this.root = new PTNode(); // not a leaf! we do not want to match any string!

        if (terms) { // add provided terms if any
            for (let term of terms) {
                this.addTermToTree(term);
            }
        }
    }

    /**
     * Add a new term to this tree.
     * @param term
     */
    public addTermToTree(term : string) {
        this.root = this.root.addTerm(term.toLowerCase());
    }


    /**
     * Checks it the string contains at least one term.
     * @param searchString
     * @returns {boolean}
     */
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

/**
 * Interface for all internal prefix tree elements: nodes and leafs
 */
export interface PTElement {

    /**
     * Adds a term into the tree structure. Does nothing on leafs.
     * @param term
     */
    addTerm(term : string) : PTElement;

    /**
     * Try to find any terms contained in the (sub-)tree structure in the search string at specified position.
     * @param searchStr  string to search
     * @param searchPos  position (index), position of the first character = 0
     */
    match(searchStr : string, searchPos : number) : boolean;

}

/**
 * Leafs mark the end of a term in the tree structure. Leafs match everything.
 *
 * Adding new terms to a leaf is not possible. Otherwise a short term would be replaced by a longer one.
 * Example:     tree.add("mozart");
 *              tree.add("mozartOverlord2000"); // this will not be added!!
 *                                              // otherwise tree.matchAtLeastOneTerm("xx_mozart_xx") == false!
 *                                              // "mozartOverlord2000" is not inside the string!
 */
class PTLeaf implements PTElement {

    addTerm(term: string): PTElement {
        // leafs do no allow adding terms
        return this;
    }

    match(searchStr : string, searchPos : number): boolean {
        return true;
    }

    public toString() : string {
        return ".";
    }
}


/**
 * Nodes use single characters as keys that point to next prefix tree elements.
 * If an empty string is added to a node, that node is replaced with a leaf.
 * Empty strings mark the ending of a term.
 */
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
