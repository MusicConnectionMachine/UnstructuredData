export class BloomFilter {
    private static bloem = require('bloem');
    private static tokenizer = new (require('natural')).WordTokenizer();
    private static ERROR_RATE = 0.1;
    private filter;

    constructor() {
        this.filter = new BloomFilter.bloem.ScalingBloem(BloomFilter.ERROR_RATE);
    }

    /**
     * Initializes bloom filter from an array of tokens
     * @param tokens                array of tokens to initialize filter from
     */
    public fromTokens(tokens : string[]) : void {
        for(let token of tokens) {
            this.filter.add(new Buffer(token.toLowerCase()));
        }
    }

    /**
     * Initializes bloom filter from text
     * @param text                  text to initialize filter from
     */
    public fromText(text : string) : void {
        let tokens : string[] = BloomFilter.tokenizer.tokenize(text);
        this.fromTokens(tokens);
    }

    /**
     * Checks if the bloom filter has seen a term before
     * @param term                  term to look for
     * @returns boolean             high likelihood of containing that term
     */
    public containsTerm(term : string) : boolean {
        return this.filter.has(new Buffer(term.toLowerCase()));
    }

    /**
     * Checks if the bloom filter has seen terms before
     * @param terms                 array of terms to look for
     * @returns boolean[]           high likelihood of containing term[i] => contains[i] == true
     */
    public containsTerms(terms : string[]) : boolean[] {
        let contains : boolean[] = [];
        for(let [index, term] of terms.entries()) {
           contains[index] = this.containsTerm(term);
        }
        return contains;
    }
}
