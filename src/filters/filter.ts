import {Term} from "../utils/term";

export abstract class Filter {

    constructor(searchTerms? : Array<Term>) {
        this.init(searchTerms);
    }

    /**
     * Replaces constructor and gets called by the super class constructor
     * @param searchTerms           search terms to initialize filter with
     */
    protected abstract init(searchTerms : Array<Term>) : void;

    /**
     * @param term                 term to add to the filter
     */
    abstract addSearchTerm(term : Term) : void;

    /**
     * @param terms                Array of tokens to add to the filter
     */
    public addSearchTerms(terms : Array<Term>) : void {
        for (let term of terms){
            this.addSearchTerm(term);
        }
    }

    /**
     * @param text
     * @returns true if at least one search term is contained in the text
     */
    abstract hasMatch(text : string) : boolean;

}
