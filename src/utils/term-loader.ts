import {Term} from "./term";
export class TermLoader {

    static fs = require('fs');
    static path = require('path');

    /**
     * Loads a list of artists names and only uses their last-names.
     * For now, no stemming is done but should be added later.
     *
     * Input format:    DBPedia JSON from group 1
     * Structure:       [ {"name":XX}, {"name":YY}, {"name":ZZ} ]
     *
     * @param filename path to the file
     * @returns {Array<string>} list of unique terms
     */
    public static loadFromDBPediaJSON(filename : string) : Array<Term> {
        let file = TermLoader.fs.readFileSync(filename, 'utf8');
        let entityList = JSON.parse(file);

        let uniques = new Set();

        for(let i = 0; i < entityList.length; i++) {
            let names = entityList[i].name.split(' ');
            uniques.add(names[names.length - 1]);
        }

        let terms : Array<Term> = [];
        for (let t of uniques) {
            terms.push(new Term(t, "id=" + Math.random()));
        }

        return terms;
    }

    /**
     * Connect to the DB using the API submodule and load all relevant terms provided by group 1.
     *
     * Right now we only get the composer names.
     */
    public static loadFromDB(callback : (err?, entities? : Array<Term>) => void) {
        // we are in:   UnstructuredData/out/utils/term-loader.js
        // magic is in: UnstructuredData/api/database.js
        let database = require("../../api/database.js");

        // optional, if not set: will be taken from API -> database.js -> createContext() -> configDB
        let databaseURI = undefined;

        let entities : Array<Term> = [];

        database.connect(databaseURI, function (context) {
            //Use { raw: true } to get raw objects instead of sequelize instances
            let artistsProm = context.models.artists.findAll({ raw: true });
            let instrumentsProm = context.models.instruments.findAll({ raw: true });
            let worksProm = context.models.works.findAll({ raw: true });
            let releasesProm = context.models.releases.findAll({ raw: true });

            //wait for all promises to resolve
            Promise.all([artistsProm, instrumentsProm, worksProm, releasesProm])
                .then(([artists, instruments, works, releases]) => {
                    for(let artist of artists) {
                        entities.push(new Term(artist.name, artist.entityId));
                    }
                    for(let instrument of instruments) {
                        entities.push(new Term(instrument.name, instrument.entityId));
                    }
                    for(let work of works) {
                        entities.push(new Term(work.title, work.entityId));
                    }
                    for(let release of releases) {
                        entities.push(new Term(release.title, release.entityId));
                    }
                    callback(null, entities);
                }).catch(err => {
                    callback(err);
                });

        });

    }


    /**
     * Returns some hardcoded composer names.
     * @returns {[string, ... ,string]}
     */
    public static loadDummyTerms() : Array<Term> {
        let str = ['Adams', 'Bach', 'Barber', 'Beethoven', 'Berg', 'Berlioz',
            'Bernstein', 'Bizet', 'Borodin', 'Brahms', 'Britten', 'Byrd', 'Chopin',
            'Copland', 'Couperin', 'Debussy', 'Donizetti', 'Elgar', 'Ellington',
            'Gabrieli', 'Gershwin', 'Glass', 'Gounod', 'Grieg', 'Handel', 'Harrison',
            'Haydn', 'Holst', 'Ives', 'Joplin', 'Liszt', 'Mahler', 'Mendelssohn',
            'Monteverdi', 'Mozart', 'Offenbach', 'Palestrina', 'Prokofiev', 'Puccini',
            'Purcell', 'Rachmaninov', 'Rameau', 'Ravel', 'Rossini', 'Satie', 'Schubert',
            'Schumann', 'Shostakovich', 'Sibelius', 'Smetana', 'Strauss', 'Stravinsky',
            'Tchaikovsky', 'Telemann',  'Verdi', 'Vivaldi', 'Wagner', 'Williams'];

        let terms : Array<Term> = [];
        for (let i = 0; i < str.length; i++) {
            terms.push(new Term(str[i], "id=" + i));
        }

        return terms;
    }

    public static loadDummyTermsCallback(callback : (err?, entities? : Array<Term>) => void) {
        callback(undefined, TermLoader.loadDummyTerms());
    }

}