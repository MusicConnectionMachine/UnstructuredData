export abstract class Filter {

    constructor(searchTerms? : Set<string>) {
        this.init(searchTerms);
    }

    /**
     * Replaces constructor and gets called by the super class constructor
     * @param searchTerms           search terms to initialize filter with
     */
    protected abstract init(searchTerms : Set<string>) : void;

    /**
     * @param token                 token to add to the filter
     */
    abstract addSearchTerm(token : string) : void;

    /**
     * @param tokens                Set of tokens to add to the filter
     */
    public addSearchTerms(tokens : Set<string>) : void {
        for (let token of tokens){
            this.addSearchTerm(token);
        }
    }

    /**
     * @param text
     * @returns true if at least one search term is contained in the text
     */
    abstract hasMatch(text : string) : boolean;


    /**
     * Returns all searchTerm matches
     * @param text
     * @returns                   hash set of matches
     */
    abstract getMatches(text : string) : Set<string>;
}
