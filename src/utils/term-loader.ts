import {Term} from "../classes/term";
export class TermLoader {


    /**
     * Connect to the DB using the API submodule and load all relevant terms provided by group 1.
     *
     * Right now we only get the composer names.
     */
    public static loadFromDB(dbParams, callback : (err?, entities? : Array<Term>) => void) {
        // we are in:   UnstructuredData/out/utils/term-loader.js
        // magic is in: UnstructuredData/api/database.js
        let database = require("../../api/database.js");

        // optional, if not set: will be taken from API -> database.js -> createContext() -> configDB
        let databaseURI = "postgresql://"
            + dbParams.dbUser + ":"
            + dbParams.dbPW + "@"
            + dbParams.dbHost + ":"
            + dbParams.dbPort + "/"
            + dbParams.dbName;

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
                        if(artist.pseudonym != null) {
                            for(let aka of artist.pseudonym) {
                                entities.push(new Term(aka, artist.entityId));
                            }
                        }
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


}