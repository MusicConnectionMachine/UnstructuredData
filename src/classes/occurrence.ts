import {Term} from "./term";
export class Occurrence {
    public term : Term;
    public positions : Array<number>;

    constructor(t : Term, p : Array<number>) {
        this.term = t;
        this.positions = p;
    };


    public static occArrayToMap(arr : Array<Occurrence>) : Map<string, [string, Array<number>]> {
        let map : Map<string, [string, Array<number>]> = new Map();
        for (let occ of arr) {
            map.set(occ.term.value, [occ.term.entityId, occ.positions]);
        }
        return map;
    }

    public static occMapToArr(map : Map<string, [string, Array<number>]>) : Array<Occurrence> {
        let arr : Array<Occurrence> = [];
        for (let [term, [id, pos]] of map) {
            arr.push(new Occurrence(new Term(term, id), pos));
        }
        return arr;
    }



}