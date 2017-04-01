import { IndexFilter } from "./index-filter";
import {IndexFilterResult} from "../utils/index-filter-result";

export class NaiveFilter extends IndexFilter {
    private static tokenizer = new (require('natural')).WordTokenizer();
    private searchTerms : Set<string>;

    /**
     * Replaces constructor and gets called by the super class constructor
     * @param searchTerms           search terms to initialize filter with
     */
    protected init(searchTerms : Set<string>) : void {
        this.searchTerms = new Set();
        if(searchTerms){
            for (let term of searchTerms) {
                this.addSearchTerm(term);
            }
        }
    }

    /**
     * Add token to filter
     * @param token                token to add to filter
     */
    public addSearchTerm(token: string): void {
        this.searchTerms.add(token.toLowerCase());
    }

    /**
     * Checks if the text contains at least one token in the text (does NOT match pre and suffixes!)
     * @param text                  text to be filtered for search terms
     * @returns boolean             text contains at least one term
     */
    public hasMatch(text: string): boolean {
        let tokens = NaiveFilter.tokenizer.tokenize(text.toLowerCase());
        for (let token of tokens) {
            if (this.searchTerms.has(token)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns all searchTerm matches (does NOT match pre and suffixes!)
     * @param text
     * @returns                        hash set of matches
     */
    public getMatches(text: string): Set<string> {
        let matches : Set<string> = new Set();
        let tokens = NaiveFilter.tokenizer.tokenize(text.toLowerCase());
        for (let token of tokens) {
            if (this.searchTerms.has(token)) {
                matches.add(token);
            }
        }
        return matches;
    }

    /**
     * Returns all searchTerm matches with index (does NOT match pre and suffixes!)
     * @param text
     * @returns                         array of occurrences
     */
    public getMatchesIndex(text: string): Array<IndexFilterResult> {
        return NaiveFilter.findOccurrences(text, this.searchTerms);
    }

    private static findOccurrences(text : string, searchTerms : Set<string>) : Array<IndexFilterResult> {
        let occurrences : Array<{term : string, positions: Array<number>}> = [];
        for (let term of searchTerms) {
            let indexes = NaiveFilter.getIndexes(text, term);
            if (indexes.length > 0) {
                occurrences.push({term : term, positions: indexes});
            }
        }
        return occurrences;
    }

    /**
     *
     * @param text
     * @param searchTerm                term to look out for, has to be lower case!
     * @return {any}
     */
    private static getIndexes(text : string, searchTerm : string) : Array<number> {
        if (searchTerm.length > text.length) { return []; }
        text = text.toLowerCase();

        let startPos = 0;
        let lastMatch = text.indexOf(searchTerm, startPos);
        let matches : Array<number> = [];
        while (lastMatch > -1) {
            matches.push(lastMatch);
            startPos = lastMatch + searchTerm.length;
            lastMatch = text.indexOf(searchTerm, startPos);
        }
        return matches;

    }

}
