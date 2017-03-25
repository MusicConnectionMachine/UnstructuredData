import { Filter } from "./filter";

export class BloomFilter extends Filter{
    private static bloem = require('bloem');
    private static ERROR_RATE = 0.1;
    private filter;

    constructor(tokens? : string[]) {
        super();
        this.filter = new BloomFilter.bloem.ScalingBloem(BloomFilter.ERROR_RATE);
        if(tokens){ super.addTokens(tokens); }
    }

    /**
     * Add token to bloom filter
     * @param token                token to add to filter
     */
    public addToken(token : string) : void {
        this.filter.add(new Buffer(token.toLowerCase()));
    }

    /**
     * Checks if the bloom filter has seen a term before
     * @param term                  term to look for
     * @returns boolean             high likelihood of containing that term
     */
    public containsToken(term : string) : boolean {
        return this.filter.has(new Buffer(term.toLowerCase()));
    }
}
