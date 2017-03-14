export class TermSearchLoader {

    static fs = require('fs');

    /**
     * Loads a list of artists names and only uses their last-names.
     * For now, no stemming is done but should be added later.
     * @param filename path to the file
     * @returns {Array<string>} list of unique terms
     */
    public static load(filename : string) : Array<string>{
        let file = TermSearchLoader.fs.readFileSync(filename, 'utf8');
        let entityList = JSON.parse(file);

        let uniques = new Set();

        for(let i = 0; i < entityList.length; i++) {
            let names = entityList[i].name.split(' ');
            uniques.add(names[names.length - 1]);
        }

        return Array.from(uniques);
    }
}