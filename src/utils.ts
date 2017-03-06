export class UnsupportedProtocolError extends Error {
    constructor(message: string) {
        super();
        this.name = 'UnsupportedProtocolError';
        this.message = (message || '');
    }
}


export class AlreadyExistsError extends Error {
    constructor(message : string) {
        super();
        this.name = 'AlreadyExistsError';
        this.message = (message || '');
    }
}
