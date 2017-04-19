import { IndexFilter } from "./index-filter";
import {Term} from "../utils/term";
import {Occurrence} from "../utils/occurrence";

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
export class PrefixTree extends IndexFilter{
    private root : PTElement;

    /**
     * Replaces constructor and gets called by the super class constructor
     * @param searchTerms           search terms to initialize filter with
     */
    protected init(searchTerms : Array<Term>) : void {
        this.root = new PTNode(); // not a leaf! we do not want to match any string!
        if(searchTerms){
            for (let term of searchTerms) {
                this.addSearchTerm(term);
            }
        }
    }

    /**
     * Add a new term to this tree.
     * @param term
     */
    public addSearchTerm(term : Term) : void {
        this.root = this.root.addTerm(term, term.value);
    }

    /**
     * Checks it the string contains at least one term. (does MATCH pre and suffixes!!!!)
     * @param text
     * @returns {boolean}
     */
    public hasMatch(text : string) : boolean {

        for (let position = 0; position < text.length; position++) {
            // try to match each position until one term is found
            let [result] = this.root.match(text, position); // tuple [Term, number]
            if (result) {
                return true;
            }
        }

        return false;
    }


    /**
     * Returns all searchTerm matches with index (does MATCH pre and suffixes!!!!)
     * @param text
     * @returns                             array of occurrences (indexes don't include match prefixes)
     */
    public getMatches(text : string) : Array<Occurrence> {
        let matches : Map<string, [string, Array<number>]> = new Map();

        for (let position = 0; position < text.length; position++) {
            let [term, matchPos] = this.root.match(text, position);
            if (term) {
                if (matches.has(term.value)) {
                    let [id, indexes] = matches.get(term.value);
                    indexes.push(matchPos);
                } else {
                    let [id, indexes] = [term.entityId, [matchPos]];
                    matches.set(term.value, [id, indexes]);
                }
            }
        }
        return Occurrence.occMapToArr(matches);
    }

    public toString() : string {
        return "PrefixTree: { " + this.root.toString() + " }";
    }

}

/**
 * Interface for all internal prefix tree elements: nodes and leafs
 */
interface PTElement {

    /**
     * Adds a term into the tree structure. Does nothing on leafs.
     * @param term
     */
    addTerm(term : Term, remainder : string) : PTElement;

    /**
     * Try to find any terms contained in the (sub-)tree structure in the search string at specified position.
     * @param searchStr  string to search
     * @param searchPos  position (index), position of the first character = 0
     * @returns tuple of boolean (matches?), string (match) and number (match index)
     */
    match(searchStr : string, searchPos : number) : [Term, number];

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

    private term : Term;

    addTerm(term: Term): PTLeaf {
        // leafs only save entity IDs
        this.term = term;
        return this;
    }

    match(searchStr : string, searchPos : number): [Term, number] {
        return [this.term, searchPos];
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

    public childNodes : {[key : string] : PTElement};
    public childLeaf : PTLeaf;

    constructor() {
        this.childNodes = {};
    }

    addTerm(term: Term, remainder : string): PTElement {
        if (remainder.length == 0) {
            // empty string as term -> create a leaf
            this.childLeaf = new PTLeaf().addTerm(term);
            return this;
        }

        // term not empty -> take first char as key; everything else is the remainder
        let key = remainder.charAt(0);
        remainder = remainder.substring(1);


        if (this.childNodes[key]) {
            // same key already exists
            this.childNodes[key].addTerm(term, remainder);

        } else {
            // this key is new -> create a new element
            let element : PTElement = new PTNode();
            element = element.addTerm(term, remainder);
            this.childNodes[key] = element;
        }

        return this;
    }

    match(searchStr : string, searchPos : number): [Term, number] {
        let key = searchStr.charAt(searchPos); // no checks for string ending, reason: charAt returns "" if position is invalid anyway

        let childNode = this.childNodes[key] || this.childLeaf;

        if (!childNode) {
            return [null, searchPos]; // no such key in this PT node -> no match
        }

        let [term] = childNode.match(searchStr, searchPos + 1);
        return [term, searchPos];
    }


    public toString() : string {
        let result = "";
        for (let key in this.childNodes) {
            result += key + "(" + this.childNodes[key].toString() + "); ";
        }

        return result.substring(0, result.length - 2);
    }


}
