export class Term {

    public term : string;
    public id : string;

    constructor(t : string, i : string) {
        this.term = t;
        this.id = i;
    }

    public equals(t : Term) : boolean {
        return t.term == this.term && t.id == this.id;
    }
}