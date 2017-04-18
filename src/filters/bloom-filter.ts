import { Filter } from "./filter";

export class BloomFilter extends Filter{
    private static bloem = require('bloem');
    private static tokenizer = new (require('natural')).WordTokenizer();
    private static ERROR_RATE = 0.1;
    private filter;

    /**
     * Replaces constructor and gets called by the super class constructor
     * @param searchTerms           search terms to initialize filter with
     */
    protected init(searchTerms : Set<string>) : void {
        this.filter = new BloomFilter.bloem.ScalingBloem(BloomFilter.ERROR_RATE);
        if(searchTerms){
            for (let term of searchTerms) {
                this.addSearchTerm(term);
            }
        }
    }

    /**
     * Add term to bloom filter
     * @param term                token to add to filter
     */
    public addSearchTerm(term : string) : void {
        let tokens = BloomFilter.tokenizer.tokenize(term);
        for (let token of tokens) {
            this.filter.add(new Buffer(token));
        }
    }

    /**
     * Checks if the bloom filter has seen at least one token in the text (does NOT match pre and suffixes!)
     * @param text                  text to be filtered for search terms
     * @returns boolean             high likelihood of containing at least one term
     */
    public hasMatch(text : string) : boolean {
        let tokens = BloomFilter.tokenizer.tokenize(text);
        for (let token of tokens) {
            if (this.filter.has(new Buffer(token))) {
                return true;
            }
        }
        return false;
    }
}
