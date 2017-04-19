export class Term {

    public value : string;
    public entityId : string;

    constructor(value : string, entityId : string) {
        this.value = value;
        this.entityId = entityId;
    }

    public equals(term : Term) : boolean {
        return term.value == this.value && term.entityId == this.entityId;
    }

    public toLowerCase() : string {
        return this.value = this.value.toLowerCase();
    }
}