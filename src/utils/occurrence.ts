import {Entity} from "./entity";
export class Occurrence {
    public term : Entity;
    public positions : Array<number>;

    constructor(t : Entity, p : Array<number>) {
        this.term = t;
        this.positions = p;
    };


    public static occArrayToMap(arr : Array<Occurrence>) : Map<string, [string, Array<number>]> {
        let map : Map<string, [string, Array<number>]> = new Map();
        for (let occ of arr) {
            map.set(occ.term.term, [occ.term.id, occ.positions]);
        }
        return map;
    }

    public static occMapToArr(map : Map<string, [string, Array<number>]>) : Array<Occurrence> {
        let arr : Array<Occurrence> = [];
        for (let [term, [id, pos]] of map) {
            arr.push(new Occurrence(new Entity(term, id), pos));
        }
        return arr;
    }



}