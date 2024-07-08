import Config from "./Config";
import Fedora from "../services/Fedora";
import FedoraDatastreamDetails from "./FedoraDatastreamDetails";
import MetadataExtractor from "../services/MetadataExtractor";
import TikaExtractor from "../services/TikaExtractor";

interface TreeNode {
    pid: string;
    title: string;
    parents: Array<TreeNode>;
}

class FedoraDataCollection {
    public metadata: Record<string, Array<string>>;
    public pid: string;
    public fedoraDetails: Record<string, Array<string>>;
    public fedoraDatastreams: Array<string>;
    public parents: Array<FedoraDataCollection> = [];
    public datastreamDetails: FedoraDatastreamDetails;
    protected config: Config;

    constructor(
        pid: string,
        metadata: Record<string, Array<string>>,
        fedoraDetails: Record<string, Array<string>>,
        fedoraDatastreams: Array<string>,
        fedora: Fedora,
        extractor: MetadataExtractor,
        tika: TikaExtractor,
        config: Config,
    ) {
        this.pid = pid;
        this.metadata = metadata;
        this.fedoraDetails = fedoraDetails;
        this.fedoraDatastreams = fedoraDatastreams;
        this.datastreamDetails = new FedoraDatastreamDetails(this, fedora, extractor, tika);
        this.config = config;
    }

    public static build(
        pid: string,
        metadata: Record<string, Array<string>> = {},
        fedoraDetails: Record<string, Array<string>> = {},
        fedoraDatastreams: Array<string> = [],
        fedora: Fedora = null,
        extractor: MetadataExtractor = null,
        tika: TikaExtractor = null,
        config: Config = null,
    ): FedoraDataCollection {
        return new FedoraDataCollection(
            pid,
            metadata,
            fedoraDetails,
            fedoraDatastreams,
            fedora ?? Fedora.getInstance(),
            extractor ?? MetadataExtractor.getInstance(),
            tika ?? TikaExtractor.getInstance(),
            config ?? Config.getInstance(),
        );
    }

    addParent(parent: FedoraDataCollection): void {
        this.parents.push(parent);
    }

    getAllHierarchyTops(): Array<FedoraDataCollection> {
        // If we have no parents, we ARE the top:
        if (this.parents.length === 0) {
            return [this];
        }
        // If one of our parents is the root, we ARE the top:
        for (let i = 0; i < this.parents.length; i++) {
            if (this.config.topLevelPids.includes(this.parents[i].pid)) {
                return [this];
            }
        }

        // Otherwise, let's collect data from our parents:
        const tops: Array<FedoraDataCollection> = [];
        for (const parent of this.parents) {
            for (const top of parent.getAllHierarchyTops()) {
                if (!tops.includes(top)) {
                    tops.push(top);
                }
            }
        }
        return tops;
    }

    /**
     * Create a flattened list of all PIDs "above" the current one.
     */
    getAllParents(): Array<string> {
        const results = [];
        this.parents.forEach((parent) => {
            const parentPids = [parent.pid].concat(parent.getAllParents());
            parentPids.forEach((pid) => {
                if (!results.includes(pid)) {
                    results.push(pid);
                }
            });
        });
        return results;
    }

    /**
     * Return a tree of parent nodes useful for generating breadcrumb trails.
     */
    getParentTree(): TreeNode {
        return {
            pid: this.pid,
            title: this.title,
            parents: this.parents.map(function (parent) {
                return parent.getParentTree();
            }),
        };
    }

    async getThumbnailHash(type: string): Promise<string> {
        const hashes = (await this.datastreamDetails.getThumbnails()).hasMessageDigest ?? [];
        for (const hash of hashes) {
            const parts = hash.split(":");
            if ((parts[1] ?? "") === type && typeof parts[2] !== "undefined") {
                return parts[2];
            }
        }
        return null;
    }

    async getFitsValueAsArray(name: string): Promise<Array<string>> {
        const fitsData = await this.datastreamDetails.getFitsData();
        return fitsData[name] ?? [];
    }

    async getFitsValueAsString(name: string): Promise<string> {
        const fitsData = await this.datastreamDetails.getFitsData();
        if (typeof fitsData[name] === "undefined") {
            return null;
        }
        return fitsData[name][0] ?? null;
    }

    async getFileSize(): Promise<string> {
        return await this.getFitsValueAsString("size");
    }

    async getFullText(): Promise<Array<string>> {
        let fullText = [];
        const rawFullText = await this.datastreamDetails.getFullText();
        for (const current in rawFullText) {
            fullText = fullText.concat(rawFullText[current]);
        }
        return fullText.map((str) => {
            // Normalize whitespace:
            return str.replace(/\s+/g, " ");
        });
    }

    async getImageHeight(): Promise<string> {
        return await this.getFitsValueAsString("imageHeight");
    }

    async getImageWidth(): Promise<string> {
        return await this.getFitsValueAsString("imageWidth");
    }

    async getLicense(): Promise<string> {
        const license = await this.datastreamDetails.getLicense();
        return license.url[0] ?? null;
    }

    async getMimeType(): Promise<Array<string>> {
        return await this.getFitsValueAsArray("mimetype");
    }

    get models(): Array<string> {
        // Separate identifier from URI prefix
        return (this.fedoraDetails.hasModel ?? []).map((model) => {
            return model.split("/").pop();
        });
    }

    get sequences(): Array<string> {
        return this.fedoraDetails.sequence ?? [];
    }

    get sortOn(): string {
        if ((this.fedoraDetails?.sortOn ?? []).length > 0) {
            return this.fedoraDetails.sortOn[0];
        }
        return "title";
    }

    get state(): string {
        if ((this.fedoraDetails?.state ?? []).length > 0) {
            return this.fedoraDetails.state[0];
        }
        return "Unknown";
    }

    get title(): string {
        return (this.metadata["dc:title"] ?? [])[0] ?? "";
    }
}

export default FedoraDataCollection;
