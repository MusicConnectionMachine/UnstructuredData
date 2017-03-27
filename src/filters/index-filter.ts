import { Filter } from "./filter";

export abstract class IndexFilter extends Filter {

    /**
     * Returns all searchTerm matches with index
     * @param text
     * @returns [string, number][]          array of tuple consisting of match and index
     */
    abstract getMatchesIndex(text : string) : [string, number][];
}
