import { Filter } from "./filter";

export class BloomFilter extends Filter{
    private static bloem = require('bloem');
    private static tokenizer = new (require('natural')).WordTokenizer();
    private static ERROR_RATE = 0.1;
    private filter;

    constructor(tokens? : string[]) {
        super();
        this.filter = new BloomFilter.bloem.ScalingBloem(BloomFilter.ERROR_RATE);
        if(tokens){ super.addSearchTerms(tokens); }
    }

    /**
     * Add token to bloom filter
     * @param token                token to add to filter
     */
    public addSearchTerm(token : string) : void {
        this.filter.add(new Buffer(token.toLowerCase()));
    }

    /**
     * Checks if the bloom filter has seen at least one token in the text
     * @param text                  text to be filtered for search terms
     * @returns boolean             high likelihood of containing at least one term
     */
    public filterText(text : string) : boolean {
        let tokens = BloomFilter.tokenizer.tokenize(text);
        for (let token of tokens) {
            if (this.filter.has(new Buffer(token.toLowerCase()))) {
                return true;
            }
        }
        return false;
    }
}
