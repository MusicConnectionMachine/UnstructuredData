import { IndexFilter } from "./index-filter";
import { Occurrence } from "../utils/occurrence";

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
     * Create a PrefixTree and add initialize it with a set of terms (optional).
     * @param tokens
     */
    constructor(tokens? : string[]) {
        super();
        this.root = new PTNode(); // not a leaf! we do not want to match any string!
        if (tokens) { super.addSearchTerms(tokens); }
    }

    /**
     * Add a new token to this tree.
     * @param token
     */
    public addSearchTerm(token : string) : void {
        this.root = this.root.addTerm(token.toLowerCase());
    }

    /**
     * Checks it the string contains at least one term.
     * @param text
     * @returns {boolean}
     */
    public containsSearchTerm(text : string) : boolean {

        for (let position = 0; position < text.length; position++) {
            // try to match each position until one term is found
            let result = this.root.match(text, position); // tuple [boolean, string, number]
            if (result[0]) {
                return true;
            }
        }

        return false;
    }

    /**
     * Returns all searchTerm matches
     * @param text
     * @returns                        hash set of matches
     */
    public getMatches(text : string) : Set<string> {

        let matches : Set<string> = new Set();

        for (let position = 0; position < text.length; position++) {
            // try to match each position until one term is found
            let result = this.root.match(text, position); // tuple [boolean, string, number]
            if (result[0]) {
                matches.add(result[1]);
            }
        }
        return matches;
    }

    /**
     * Returns all searchTerm matches with index
     * @param text
     * @returns [string, number][]          array of tuple consisting of match and index
     */
    public getMatchesIndex(text : string) : Array<Occurrence> {
        let matches : Map<string, Array<number>> = new Map();

        for (let position = 0; position < text.length; position++) {
            // try to match each position until one term is found
            let result = this.root.match(text, position); // tuple [boolean, string, number]
            if (result[0]) {
                let match : string = result[1];
                let index : number = result[2];
                if (matches.has(match)) {
                    matches.get(match).push(index);
                } else {
                    matches.set(match, [index]);
                }
            }
        }
        return Occurrence.mapToArray(matches);
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
    addTerm(term : string) : PTElement;

    /**
     * Try to find any terms contained in the (sub-)tree structure in the search string at specified position.
     * @param searchStr  string to search
     * @param searchPos  position (index), position of the first character = 0
     * @returns tuple of boolean (matches?), string (match) and number (match index)
     */
    match(searchStr : string, searchPos : number) : [boolean, string, number];

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

    match(searchStr : string, searchPos : number): [boolean, string, number] {
        return [true, '', searchPos];
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

    match(searchStr : string, searchPos : number): [boolean, string, number] {
        let key = searchStr.charAt(searchPos).toLowerCase(); // no checks for string ending, reason: charAt returns "" if position is invalid anyway

        if (!this.hasOwnProperty(key))  return [false, '', searchPos]; // no such key in this PT node -> no match

        let childNode = this[key]; // continue search in child node

        let childResult = childNode.match(searchStr, searchPos + 1);
        return [childResult[0], key + childResult[1], searchPos];
    }


    public toString() : string {
        let result = "";
        for (let key in this) {
            result += key + "(" + this[key].toString() + "); ";
        }

        return result.substring(0, result.length - 2);
    }


}
