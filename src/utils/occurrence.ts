export class Occurrence {
    public term : string;
    public positions : Array<number>;

    constructor(t : string, p : Array<number>) {
        this.term = t;
        this.positions = p;
    };


    /**
     * Transforms a map of [term] => indexes[] into an array of occurrences
     * @param occurrenceMap                             map of [term] => indexes[]
     * @return {Array<Occurrence>}
     */
    public static occurrenceMapToArray (occurrenceMap : Map<string, Array<number>>) : Array<Occurrence> {
        let occurrences : Array<Occurrence> = [];
        for (let [term, indexes] of occurrenceMap.entries()) {
            let occurrence = new Occurrence(term, indexes);
            occurrences.push(occurrence);
        }
        return occurrences;
    }

    /**
     * Inverse of occurrenceMapToArray
     * @param occurrenceArray
     * @return {Map<string, Array<number>>}
     */
    public static occurrenceArrayToMap (occurrenceArray : Array<Occurrence>) : Map<string, Array<number>> {
        let occurrences : Map<string, Array<number>> = new Map();
        for (let occurrence of occurrenceArray) {
            occurrences.set(occurrence.term, occurrence.positions);
        }
        return occurrences;
    }
}