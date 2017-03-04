/**
 * Created by lukas on 3/4/17.
 */

const snowball = require('node-snowball');
const tokenizer = require('hx-tokenizer');
const stemHashes = {};

exports.parse = function(content : string) : Object {
    let tokens = tokenize(content);
    return stem(tokens);
};

/**
 * Tokenizes the given string.
 * @param content
 * @returns {{}} keys: found tokens, values: occurences of the token.
 */
const tokenize = function(content : string) : Object {
    let tokens = tokenizer.tokenize(content);
    let occurences = {};

    for(let i = 0; i < tokens.length; i++) {
        //Sum up all found tokens
        occurences[tokens[i]] = (occurences[tokens[i]] || 0) + 1;
    }

    return occurences;
};

/**
 * Stems tokens in given tokenlist and creates new Object with stems as keys and summed up occurences
 * as values. If two tokens have the same stem, the stems entry will contain the sum of both their
 * occurences.
 *
 * @param tokenlist Object containing tokens as keys and occurences as values
 * @returns {{}} Object containing stemmed tokens as keys and occurences as values.
 */
const stem = function(tokenlist : Object) : Object{
    let stems = {};

    for(let token in tokenlist) {

        //Check if a steam for the token has already been hashed, if not create stem and hash it.
        if(!(token in stemHashes)) {
            stemHashes[token] = snowball.stemword(token, 'english');
        }

        /*
        Get stem from hashed stems. Sum up all occurences with this stem.
        e.g. For tokenlist {'apple': 2, 'apples': 3} stems will contain entry
        {'apple': 5}.
         */
        stems[stemHashes[token]] = (stems[stemHashes[token]] || 0) + tokenlist[token];
    }

    console.log(stems);
    return stems;
};