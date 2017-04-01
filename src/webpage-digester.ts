import {IndexFilter} from "./filters/index-filter";
import {Filter} from "./filters/filter";
import {WebPage} from "./utils/webpage";
import {Term} from "./utils/term";
import {Occurrence} from "./utils/occurrence";
import {IndexFilterResult} from "./utils/index-filter-result";


export class WebPageDigester {
    private termToIDMap : Map<string, string>;
    private mainFilter : new (searchTerms? : Set<string>) =>  IndexFilter;
    private mainFilterInstance : IndexFilter;
    private preFilterInstance : Filter;

    constructor(searchTerms : Array<Term>) {
        this.termToIDMap = new Map();

        for (let term of searchTerms) {
            this.termToIDMap.set(term.term, term.id);
        }


    }

    /**
     * Set the main filter of the digester which will determine the indexes of all matches
     * Be careful which filter to use here as not all filters will give you exact matches!
     * @param filterConstructor                             Class of the filter
     */
    public setFilter<T extends IndexFilter> (filterConstructor : new (terms? : Set<string>) => T) : WebPageDigester {
        this.mainFilter = filterConstructor;
        this.mainFilterInstance = undefined;
        return this;
    }

    /**
     * Set a pre-filter which will reduce the number of searchTerms for the main filter
     * If the pre-filter doesn't find any matches it will skip the main filter entirely
     * This is very useful if your main filter is slow
     * @param filterConstructor                             Class of the pre-filter
     */
    public setPreFilter<T extends Filter> (filterConstructor : new (terms? : Set<string>) => T) : WebPageDigester {
        // construct a set from the map
        let set : Set<string> = new Set();
        for (let [term /*, id*/] of this.termToIDMap.entries())  set.add(term);

        this.preFilterInstance = new filterConstructor(set);
        return this;
    }

    public removePreFilter() : WebPageDigester {
        // remove references to both instances as current mainFilterInstance is NOT independent form preFilter
        this.preFilterInstance = undefined;
        this.mainFilterInstance = undefined;
        return this;
    }

    /**
     * Adds Occurrences to a WebPage object. First applies a preFilter if set, to find matches
     * and then applies the mainFilter to its output to find the exact positions within the text.
     * If no preFilter is set, the mainFilter will be fed with all searchTerms.
     * @param webPage                                       WebPage object to find occurrences in.
     * @param mergeOccurrences                              When true occurrences will be merged instead of overwritten
     * @return {WebPage}                                    Reference to the same WebPage with added occurrences
     */
    public digest(webPage : WebPage, mergeOccurrences? : boolean) : WebPage {

        if(!this.mainFilter) {
            console.warn("Couldn't apply any filters as filter isn't set! Set a filter with .setFilter()!");
            return webPage;
        }

        let pageContent = webPage.content;

        // use preFilter if present
        if (this.preFilterInstance) {
            // find all matches, but ignore the match indexes for now
            let matches = this.preFilterInstance.getMatches(pageContent);

            // Stop here if there aren't any matches.
            if (matches.size === 0) {
                return webPage;
            }

            // create new IndexFilter instance from matched searchTerms
            this.mainFilterInstance = new this.mainFilter(matches);
        }

        // create new mainFilterInstance from this.searchTerms if not present
        if (!this.mainFilterInstance) {
            // construct a set from the map
            let set : Set<string> = new Set();
            for (let [term /*, id*/] of this.termToIDMap.entries())  set.add(term);

            this.mainFilterInstance = new this.mainFilter(set);
        }

        let matchesIndex : Array<IndexFilterResult>
            = this.mainFilterInstance.getMatchesIndex(pageContent);

        let occs : Array<Occurrence> = [];
        for (let match of matchesIndex) {
            let termStr = match.term;
            let termID = this.termToIDMap.get(termStr);

            occs.push(new Occurrence(new Term(termStr, termID), match.positions));

        }

        // check if we have to merge occurrences and update webPage object
        if (mergeOccurrences) {
            webPage.mergeOccurrences(occs);
        } else {
            webPage.occurrences = occs
        }

        return webPage;
    }


}
