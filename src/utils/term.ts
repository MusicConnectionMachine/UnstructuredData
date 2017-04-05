export class Term {

    public term : string;
    public entityId : string;

    constructor(t : string, i : string) {
        this.term = t;
        this.entityId = i;
    }

    public equals(t : Term) : boolean {
        return t.term == this.term && t.entityId == this.entityId;
    }
}