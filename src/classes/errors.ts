export class UnsupportedProtocolError extends Error {
    constructor(message? : string) {
        super(message);
        this.name = 'UnsupportedProtocolError';
    }
}

export class RequestTimeoutError extends Error {
    constructor(message? : string) {
        super(message);
        this.name = 'RequestTimeoutError';
    }
}