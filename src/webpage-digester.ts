import {IndexFilter} from "./filters/index-filter";
import {Filter} from "./filters/filter";
import {WebPage} from "./utils/webpage";
import {Term} from "./utils/term";
import {Occurrence} from "./utils/occurrence";
import {Logger} from "./utils/logger";


export class WebPageDigester {
    private searchTerms : Array<Term>;
    private mainFilterInstance : IndexFilter;
    private preFilterInstance : Filter;

    constructor(searchTerms : Array<Term>) {
        for (let term of searchTerms) {
            term.toLowerCase();
        }
        this.searchTerms = searchTerms;
    }

    /**
     * Set the main filter of the digester which will determine the indexes of all matches
     * Be careful which filter to use here as not all filters will give you exact matches!
     * @param filterConstructor                             Class of the filter
     */
    public setFilter<T extends IndexFilter> (filterConstructor : new (terms? : Array<Term>) => T) : WebPageDigester {
        this.mainFilterInstance = new filterConstructor(this.searchTerms);
        return this;
    }

    /**
     * Set a pre-filter which will reduce the number of searchTerms for the main filter
     * If the pre-filter doesn't find any matches it will skip the main filter entirely
     * This is very useful if your main filter is slow
     * @param filterConstructor                             Class of the pre-filter
     */
    public setPreFilter<T extends Filter> (filterConstructor : new (terms? : Array<Term>) => T) : WebPageDigester {
        this.preFilterInstance = new filterConstructor(this.searchTerms);
        return this;
    }

    public removePreFilter() : WebPageDigester {
        this.preFilterInstance = undefined;
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

        if(!this.mainFilterInstance) {
            Logger.winston.warn("Couldn't apply any filters as filter isn't set! Set a filter with .setFilter()!");
            return webPage;
        }

        let pageContent = webPage.content.toLowerCase();

        // use preFilter if present
        if (this.preFilterInstance) {
            // Check for matches, but ignore the match indexes for now
            let matches = this.preFilterInstance.hasMatch(pageContent);

            // Stop here if there aren't any matches.
            if (!matches) {
                return webPage;
            }
        }

        let occurrences : Array<Occurrence> = this.mainFilterInstance.getMatches(pageContent);

        // check if we have to merge occurrences and update webPage object
        if (mergeOccurrences) {
            webPage.mergeOccurrences(occurrences);
        } else {
            webPage.occurrences = occurrences
        }

        return webPage;
    }
}
