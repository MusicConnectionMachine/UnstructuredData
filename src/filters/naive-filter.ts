import { IndexFilter } from "./index-filter";
import { Occurrence } from "../utils/occurrence";

export class NaiveFilter extends IndexFilter {
    private static tokenizer = new (require('natural')).WordTokenizer();
    private searchTerms : Set<string>;

    constructor(terms? : Array<string>) {
        super();
        this.searchTerms = new Set();
        if (terms) { super.addSearchTerms(terms); }
    }

    public addSearchTerm(token: string): void {
        this.searchTerms.add(token.toLowerCase());
    }

    public containsSearchTerm(text: string): boolean {
        let tokens = NaiveFilter.tokenizer.tokenize(text.toLowerCase());
        for (let token of tokens) {
            if (this.searchTerms.has(token)) {
                return true;
            }
        }
        return false;
    }

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

    public getMatchesIndex(text: string): Array<Occurrence> {
        return NaiveFilter.findOccurrences(text, this.searchTerms);
    }

    public static findOccurrences(text : string, searchTerms : Set<string>) : Array<Occurrence> {
        let occurrences : Array<Occurrence> = [];
        for (let term of searchTerms) {
            let indexes = NaiveFilter.getIndexes(text, term);
            if (indexes.length > 0) {
                occurrences.push(new Occurrence(term, indexes));
            }
        }
        return occurrences;
    }

    private static getIndexes(text : string, searchTerm : string) : Array<number> {
        if (searchTerm.length > text.length) { return []; }
        text = text.toLowerCase();

        let startPos = 0;
        let lastMatch : number;
        let matches : Array<number> = [];
        while ((lastMatch = text.indexOf(searchTerm, startPos)) > -1) {
            matches.push(lastMatch);
            startPos = lastMatch + searchTerm.length;
        }
        return matches;

    }

}
