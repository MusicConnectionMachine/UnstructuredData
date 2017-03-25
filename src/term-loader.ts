export class TermLoader {

    static fs = require('fs');

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
    public static loadFromDBPediaJSON(filename : string) : Array<string> {
        let file = TermLoader.fs.readFileSync(filename, 'utf8');
        let entityList = JSON.parse(file);

        let uniques = new Set();

        for(let i = 0; i < entityList.length; i++) {
            let names = entityList[i].name.split(' ');
            uniques.add(names[names.length - 1]);
        }

        return Array.from(uniques);
    }

    /**
     * TODO:
     * Loads all relevant terms provided by group 1 from the database.
     *
     * @returns {[string]}
     */
    public static loadFromDB() : Array<string> {
        return ["TODO: implement database query here!"];
    }


    /**
     * Returns some hardcoded composer names.
     * @returns {[string, ... ,string]}
     */
    public static loadDummyTerms() : Array<string> {

        return ['Adams', 'Bach', 'Barber', 'Beethoven', 'Berg', 'Berlioz',
        'Bernstein', 'Bizet', 'Borodin', 'Brahms', 'Britten', 'Byrd', 'Chopin',
        'Copland', 'Couperin', 'Debussy', 'Donizetti', 'Elgar', 'Ellington',
        'Gabrieli', 'Gershwin', 'Glass', 'Gounod', 'Grieg', 'Handel', 'Harrison',
        'Haydn', 'Holst', 'Ives', 'Joplin', 'Liszt', 'Mahler', 'Mendelssohn',
        'Monteverdi', 'Mozart', 'Offenbach', 'Palestrina', 'Prokofiev', 'Puccini',
        'Purcell', 'Rachmaninov', 'Rameau', 'Ravel', 'Rossini', 'Satie', 'Schubert',
        'Schumann', 'Shostakovich', 'Sibelius', 'Smetana', 'Strauss', 'Stravinsky',
        'Tchaikovsky', 'Telemann',  'Verdi', 'Vivaldi', 'Wagner', 'Williams'];
    }

}