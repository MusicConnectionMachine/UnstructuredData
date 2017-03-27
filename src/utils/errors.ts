export class UnsupportedProtocolError extends Error {
    constructor(message? : string) {
        super(message);
        this.name = 'UnsupportedProtocolError';
    }
}

export class AlreadyExistsError extends Error {
    constructor(message? : string) {
        super(message);
        this.name = 'AlreadyExistsError';
    }
}

export class UnsupportedFileFormat extends Error {
    constructor(message? : string) {
        super(message);
        this.name = 'UnsupportedFileFormat';
    }
}

