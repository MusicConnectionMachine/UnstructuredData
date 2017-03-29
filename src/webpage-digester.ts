import {IndexFilter} from "./filters/index-filter";
import {Filter} from "./filters/filter";
import {WebPage} from "./utils/webpage";
import {Occurrence} from "./utils/occurrence";


export class WebPageDigester {
    private searchTerms : Array<string>;
    private mainFilter : new () => IndexFilter;
    private mainFilterInstance : IndexFilter;
    private preFilterInstance : Filter;

    constructor(searchTerms : Array<string>) {
        this.searchTerms = searchTerms;
    }

    /**
     * Set the main filter of the digester which will determine the indexes of all matches
     * Be careful which filter to use here as not all filters will give you exact matches!
     * @param filterConstructor                             Class of the filter
     */
    public setFilter<T extends IndexFilter> (filterConstructor : new () => T) : WebPageDigester {
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
    public setPreFilter<T extends Filter> (filterConstructor : new () => T) : WebPageDigester{
        this.preFilterInstance = new filterConstructor();
        this.preFilterInstance.addSearchTerms(this.searchTerms);
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
            this.mainFilterInstance = new this.mainFilter();
            this.mainFilterInstance.addSearchTerms([...matches]); // [... Set] operator converts Set to Array
        }

        // create new mainFilterInstance from this.searchTerms if not present
        if (!this.mainFilterInstance) {
            this.mainFilterInstance = new this.mainFilter();
            this.mainFilterInstance.addSearchTerms(this.searchTerms);
        }

        let occurrences = this.mainFilterInstance.getMatchesIndex(pageContent);

        // check if we have to merge occurrences and update webPage object
        if (mergeOccurrences && webPage.occurrences && occurrences.length > 0 && webPage.occurrences.length > 0) {

            // merge occurrences
            webPage.occurrences = WebPageDigester.mergeOccurrences(occurrences, webPage.occurrences);

        } else {

            // overwrite occurrences
            webPage.occurrences = occurrences
        }

        return webPage;
    }

    /**
     * [HELPER FUNCTION] Deeply merges two arrays of Occurrences into a single one
     * @param occ1
     * @param occ2
     * @return {Array<Occurrence>}
     */
    private static mergeOccurrences(occ1 : Array<Occurrence>, occ2 : Array<Occurrence>) : Array<Occurrence> {

        // convert one of the arrays into Map
        let mergedOccurrencesMap = Occurrence.occurrenceArrayToMap(occ1);

        // add new occurrences one by one to the map
        for (let occurrence of occ2) {

            // check if term is already present in map
            if (mergedOccurrencesMap.has(occurrence.term)) {

                // merge indexes, convert already present indexes to map
                let mergedIndexes = new Set(mergedOccurrencesMap.get(occurrence.term));
                for (let index of occurrence.positions) {
                    mergedIndexes.add(index);
                }
                mergedOccurrencesMap.set(occurrence.term, [...mergedIndexes]);

            } else {
                mergedOccurrencesMap.set(occurrence.term, occurrence.positions);
            }

        }

        // convert map back to an array of Occurrences
        return Occurrence.occurrenceMapToArray(mergedOccurrencesMap);
    }
}
