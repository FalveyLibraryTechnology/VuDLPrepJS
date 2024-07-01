import { Fedora } from "./Fedora";
import Config from "../models/Config";
import FedoraDataCollection from "../models/FedoraDataCollection";
import MetadataExtractor from "./MetadataExtractor";
import TikaExtractor from "./TikaExtractor";
import SolrCache from "./SolrCache";

class FedoraDataCollector {
    private static instance: FedoraDataCollector;

    fedora: Fedora;
    extractor: MetadataExtractor;
    config: Config;
    tika: TikaExtractor;
    cache: SolrCache;

    constructor(fedora: Fedora, extractor: MetadataExtractor, config: Config, tika: TikaExtractor, cache: SolrCache) {
        this.fedora = fedora;
        this.extractor = extractor;
        this.config = config;
        this.tika = tika;
        this.cache = cache;
    }

    public static getInstance(): FedoraDataCollector {
        if (!FedoraDataCollector.instance) {
            FedoraDataCollector.instance = new FedoraDataCollector(
                Fedora.getInstance(),
                MetadataExtractor.getInstance(),
                Config.getInstance(),
                TikaExtractor.getInstance(),
                SolrCache.getInstance(),
            );
        }
        return FedoraDataCollector.instance;
    }

    async getObjectData(pid: string): Promise<FedoraDataCollection> {
        const cachedRecord = this.cache.getDocumentFromCache(pid);
        let metadata;
        let fedoraDetails;
        let fedoraDatastreams;
        if (cachedRecord === false) {
            // Use Fedora to get data
            const DCPromise = this.fedora.getDublinCore(pid);
            const RDFPromise = this.fedora.getRdf(pid);
            const [DC, RDF] = await Promise.all([DCPromise, RDFPromise]);
            metadata = this.extractor.extractMetadata(DC);
            fedoraDetails = this.extractor.extractFedoraDetails(RDF);
            fedoraDatastreams = this.extractor.extractFedoraDatastreams(RDF);
        } else {
            // Parse data out of local cache (reversing work done by Solr indexer)
            metadata = {};
            fedoraDetails = {};
            const keys = Object.keys(cachedRecord);
            keys.forEach((key) => {
                const keyParts = key.split(".");
                if (keyParts.length < 2) {
                    return;
                }
                if (keyParts[0] === "dc") {
                    metadata[key.replace(".", ":").replace("_txt_mv", "")] = cachedRecord[key];
                } else if (keyParts[0] === "fgs" || keyParts[0] === "relsext") {
                    fedoraDetails[keyParts[1].replace("_txt_mv", "")] = cachedRecord[key];
                }
            });
            fedoraDatastreams = cachedRecord.datastream_str_mv ?? [];
        }

        return new FedoraDataCollection(
            pid,
            metadata,
            fedoraDetails,
            fedoraDatastreams,
            this.fedora,
            this.extractor,
            this.tika,
            this.config,
        );
    }

    /**
     * Retrieve an object including parent data
     *
     * @param pid Object ID to retrieve
     * @param shallow True to load immediate parents only; false to load entire hierarchy
     * @returns Object data including requested parents
     */
    async getHierarchy(pid: string, shallow = false): Promise<FedoraDataCollection> {
        const result = await this.getObjectData(pid);
        // Create promises to retrieve parents asynchronously...
        const promises = (result.fedoraDetails.isMemberOf ?? []).map(async (resource) => {
            const parentPid = resource.split("/").pop();
            const parent = shallow ? await this.getObjectData(parentPid) : await this.getHierarchy(parentPid);
            result.addParent(parent);
        });
        // Now wait for the promises to complete before we return results, so
        // nothing happens out of order.
        await Promise.all(promises);
        return result;
    }
}

export default FedoraDataCollector;
