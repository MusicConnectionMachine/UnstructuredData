export abstract class Filter {

    /**
     * @param token                token to add to the filter
     */
    abstract addSearchTerm(token : string) : void;

    /**
     * @param tokens                array of tokens to add to the filter
     */
    public addSearchTerms(tokens : string[]) : void {
        for (let token of tokens){
            this.addSearchTerm(token);
        }
    }

    /**
     * @param text
     * @returns true if at least one search term is contained in the text
     */
    abstract containsSearchTerm(text : string) : boolean;


    /**
     * Returns all searchTerm matches
     * @param text
     * @returns string[]          array of matches
     */
    abstract getMatches(text : string) : string[];
}
