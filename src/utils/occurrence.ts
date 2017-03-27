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
    public static mapToArray (occurrenceMap : Map<string, Array<number>>) : Array<Occurrence> {
        let occurrences : Array<Occurrence> = [];
        for (let [term, indexes] of occurrenceMap.entries()) {
            let occurrence = new Occurrence(term, indexes);
            occurrences.push(occurrence);
        }
        return occurrences;
    }
}