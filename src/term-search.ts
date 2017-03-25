import {WebPage} from "./utils/web-page";
import {TermLoader} from "./utils/term-loader";
/**
 * Container to store the term (substring) and the positions where it can be found in the search string.
 */
export class Occurrence {
    public term : string;
    public positions : Array<number>;

    constructor(t : string, p : Array<number>) {
        this.term = t;
        this.positions = p;
    };
}


/**
 * Implemented:
 *  - search in string (naive)
 *
 * Nice to have:
 *  - search in stream (following npm packages might be helpful: streamsearch, node-text-stream-search)
 *  - search in string (more efficient, if we have longer strings)
 *
 */
export class TermSearch {

    /**
     * Searches a string for ALL occurrences of a set of terms (substrings).
     * Naive implementation: search is repeated for each term, complexity: O( str.length * terms.length )
     *
     * Returns an array that contains an Occurrence object for each term that could be found at least once.
     * Each Occurrence object contains the positions where the term can be found in the search string.
     *
     * A position is an index and marks the beginning of the term in the search string:
     * term = "bb"; search string = "aabbccbb"      ==>     positions = [2, 6]
     *
     * @param str                   string to search
     * @param terms                 what to search
     * @param caseSens              use case sensitive search
     * @returns {Array<Occurrence>}
     */
    public static searchTermsInString(str : string, terms : Array<string>, caseSens : boolean) : Array<Occurrence> {
        let occ : Occurrence;
        let occs : Array<Occurrence> = [];

        // repeat search for each term
        for (let term of terms) {
            occ = TermSearch.searchTermInString(str, term, caseSens);
            if (occ != null) occs.push(occ);
        }

        return occs;
    }

    /**
     * Searches a string for all occurrences of a term (substring) and returns an Occurrence object
     * that contains the term and all the positions where it can be found in the search string.
     *
     * @param str                   string to search
     * @param term                  what to search
     * @param caseSens              use case sensitive search
     * @returns {Occurrence|null}   Occurrence object or null if str doesn't contain term
     *
     * Inspiration: http://stackoverflow.com/questions/3410464/how-to-find-indices-of-all-occurrences-of-one-string-in-another-in-javascript
     */
    private static searchTermInString(str : string, term : string, caseSens : boolean) : Occurrence {
        if (str.length < term.length) return null; // search string too short

        let termFormatted = term;
        if (!caseSens) {
            // not case sensitive -> convert to lowercase
            str = str.toLowerCase();
            termFormatted = term.toLowerCase();
        }

        let startPos = 0;
        let foundPosition : number;
        let foundPositions : Array<number> = [];

        // continue search from startPos as long as we find new occurrences
        while ((foundPosition = str.indexOf(termFormatted, startPos)) > -1) {
            foundPositions.push(foundPosition);
            startPos = foundPosition + term.length;
        }

        if (foundPositions.length == 0) return null; // nothing found -> return null
        return new Occurrence(term, foundPositions);
    }

    public static searchTermsInStemMap(stems : { [stem : string] : Array<WebPage> }) : Array<WebPage> {
        let positives = new Set();
        let terms = TermLoader.loadFromDBPediaJSON('terms/dbpedia_Classical_musicians_by_instruments_and_nationality.json');
        //let stemCount = Object.keys(stems).length;

        //Get each webpage that is matching a search term.
        //O(n^3) but shouldn't matter much since this is only done once per file
        for(let i = 0; i < terms.length; i++) {
            for(let key in stems) {
                if(terms[i] == key) {
                    for(let n = 0; n < stems[key].length; n++) {
                        stems[key][n].match = key;
                        positives.add(stems[key][n]);
                    }
                }
            }
        }

        return Array.from(positives);
    }

}
