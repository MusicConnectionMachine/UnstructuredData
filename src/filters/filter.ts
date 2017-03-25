export abstract class Filter {
    private static tokenizer = new (require('natural')).WordTokenizer();

    /**
     * Add token to the filter
     * @param tokens                array of tokens to add to the filter
     */
    abstract addToken(tokens : string) : void;

    /**
     * Add tokens to the filter
     * @param tokens
     */
    public addTokens(tokens : string[]) : void {
        for (let token of tokens){
            this.addToken(token);
        }
    }

    /**
     * Add text to the filter
     * @param text                  text to add to the filter
     */
    public addText(text : string) : void {
        let tokens : string[] = Filter.tokenizer.tokenize(text);
        this.addTokens(tokens);
    }

    /**
     * Checks if the bloom filter has seen a term before
     * @param token                  term to look for
     * @returns boolean             high likelihood of containing that term
     */
     abstract containsToken(token : string) : boolean;

    /**
     * Checks if the filter has seen terms before
     * @param tokens                 array of terms to look for
     * @returns string[]            high likelihood of containing returned terms
     */
    public containsTokens(tokens : string[]) : string[] {
        let contains : string[] = [];
        for(let token of tokens) {
            if(this.containsToken(token)){
                contains.push(token);
            }
        }
        return contains;
    }
}
