export class WordPreprocessor {

    static snowball = require('node-snowball');
    static natural = require('natural');
    static tokenizer = new WordPreprocessor.natural.WordTokenizer();
    static stemHashes = {};


    public static process(content : string) : Object {
        let tokens = WordPreprocessor.tokenize(content);
        return WordPreprocessor.stem(tokens);
    }


    /**
     * Tokenizes the given string.
     * @param content
     * @returns {{}} keys: found tokens, values: occurences of the token.
     */
    private static tokenize(content : string) : Object {
        let tokens = WordPreprocessor.tokenizer.tokenize(content);
        let occurrences = {};

        for(let i = 0; i < tokens.length; i++) {
            //Sum up all found tokens
            occurrences[tokens[i]] = (occurrences[tokens[i]] || 0) + 1;
        }

        return occurrences;
    }


    /**
     * Stems tokens in given tokenlist and creates new Object with stems as keys and summed up occurences
     * as values. If two tokens have the same stem, the stems entry will contain the sum of both their
     * occurences.
     *
     * @param tokenlist Object containing tokens as keys and the number of occurences as values: {'terminator': 2}
     * @returns {{}} Object containing stemmed tokens as keys and occurences as values.
     */
    private static stem(tokenlist : Object) : Object{
        let stems = {};

        for(let token in tokenlist) {

            //Check if a stem for the token has already been hashed, if not create stem and hash it.
            if(!(token in WordPreprocessor.stemHashes)) {
                /*
                WordPreprocessor.stemHashes[token] = WordPreprocessor.natural.PorterStemmer.stem(token);
                */
                WordPreprocessor.stemHashes[token] = WordPreprocessor.snowball.stemword(token, 'english');
            }

            /*
             Get stem from hashed stems. Sum up all occurences with this stem.
             e.g. For tokenlist {'apple': 2, 'apples': 3} stems will contain entry
             {'apple': 5}.
             */
            stems[WordPreprocessor.stemHashes[token]]
                = (stems[WordPreprocessor.stemHashes[token]] || 0) + tokenlist[token];
        }

        return stems;
    }
}