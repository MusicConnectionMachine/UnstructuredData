export class IndexFilterResult {
    public term: string;
    public positions : Array<number>;



    /**
     * Transforms a map of [term] => indexes[] into an array of occurrences
     * @param occurrenceMap                             map of [term] => indexes[]
     * @return {Array<Occurrence>}
     */
    public static ifrMapToArray (occurrenceMap : Map<string, Array<number>>) : Array<IndexFilterResult> {
        let occurrences : Array<{term : string, positions: Array<number>}> = [];
        for (let [term, indexes] of occurrenceMap.entries()) {
            occurrences.push({term: term, positions: indexes});
        }
        return occurrences;
    }

    /**
     * Inverse of ifrMapToArray
     * @param occurrenceArray
     * @return {Map<string, Array<number>>}
     */
    public static ifrArrayToMap (occurrenceArray : Array<IndexFilterResult>) : Map<string, Array<number>> {
        let occurrences : Map<string, Array<number>> = new Map();
        for (let occurrence of occurrenceArray) {
            occurrences.set(occurrence.term, occurrence.positions);
        }
        return occurrences;
    }

}