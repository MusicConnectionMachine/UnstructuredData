import {IndexFilter} from "./index-filter";
import {IndexFilterResult} from "../utils/index-filter-result";

export class NaiveFilter extends IndexFilter {
    private static tokenizer = new (require('natural')).WordTokenizer();
    private searchTerms : Set<string>;
    private searchTokens : Set<string>;

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
     * Add term to filter
     * @param term                term to add to filter
     */
    public addSearchTerm(term: string): void {
        this.searchTerms.add(term);
        this.addToSearchTokens(term);
    }

    /**
     * Checks if the text contains at least one token in the text (does NOT match pre and suffixes!)
     * @param text                  text to be filtered for search terms
     * @returns boolean             text contains at least one term
     */
    public hasMatch(text: string): boolean {
        if (!this.searchTokens) {
            this.lazyInitSearchTokens();
        }
        let tokens = NaiveFilter.tokenizer.tokenize(text);
        for (let token of tokens) {
            if (this.searchTokens.has(token)) {
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
        if (!this.searchTokens) {
            this.lazyInitSearchTokens();
        }
        let matches : Set<string> = new Set();
        let tokens = NaiveFilter.tokenizer.tokenize(text);
        for (let token of tokens) {
            if (this.searchTokens.has(token)) {
                matches.add(token);
            }
        }
        return matches;
    }

    /**
     * Returns all searchTerm matches with index (does match pre and suffixes!)
     * @param text
     * @returns                         array of occurrences
     */
    public getMatchesIndex(text: string): Array<IndexFilterResult> {
        return NaiveFilter.findOccurrences(text, this.searchTerms);
    }

    private static findOccurrences(text : string, searchTerms : Set<string>) : Array<IndexFilterResult> {
        let occurrences : Array<IndexFilterResult> = [];
        for (let term of searchTerms) {
            let indexes = NaiveFilter.getIndexes(text, term);
            if (indexes.length > 0) {
                occurrences.push(new IndexFilterResult(term, indexes));
            }
        }
        return occurrences;
    }

    /**
     * @param text
     * @param searchTerm                term to look out for, has to be lower case!
     * @return {any}
     */
    private static getIndexes(text : string, searchTerm : string) : Array<number> {
        if (searchTerm.length > text.length) { return []; }

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

    /**
     * Gets called by .hasMatch() and .getMatches() when the token set hasn't been initialized
     * The token set only gets initialized when we really need it.
     */
    private lazyInitSearchTokens() {
        this.searchTokens = new Set();
        for (let term of this.searchTerms) {
            this.addToSearchTokens(term);
        }
    }

    /**
     * Splits term into tokens and adds it to token set. Doesn't add anything if token set is undefined as
     * the token set gets layy initialized when we need it.
     * @param term
     */
    private addToSearchTokens(term : string) {
        if (this.searchTokens) {
            let tokens = NaiveFilter.tokenizer.tokenize(term);
            for (let token of tokens) {
                this.searchTokens.add(token);
            }
        }
    }
}
