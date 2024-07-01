import Config from "../models/Config";
import DateSanitizer from "./DateSanitizer";
import FedoraDataCollection from "../models/FedoraDataCollection";
import FedoraDataCollector from "./FedoraDataCollector";
import http = require("needle");
import { NeedleResponse } from "./interfaces";
import Solr from "./Solr";
import SolrCache from "./SolrCache";

interface SolrFields {
    [key: string]: string | Array<string>;
}

class SolrIndexer {
    private static instance: SolrIndexer;
    config: Config;
    fedoraDataCollector: FedoraDataCollector;
    solr: Solr;
    solrCache: SolrCache;
    lastIndexResults: SolrFields | null = null;

    constructor(fedoraDataCollector: FedoraDataCollector, solr: Solr, solrCache: SolrCache, config: Config) {
        this.fedoraDataCollector = fedoraDataCollector;
        this.config = config;
        this.solr = solr;
        this.solrCache = solrCache;
    }

    public static getInstance(): SolrIndexer {
        if (!SolrIndexer.instance) {
            SolrIndexer.instance = new SolrIndexer(
                FedoraDataCollector.getInstance(),
                Solr.getInstance(),
                SolrCache.getInstance(),
                Config.getInstance(),
            );
        }
        return SolrIndexer.instance;
    }

    protected padNumber(num: string): string {
        // Yes, I wrote a left_pad function.
        const paddedNumber = "0000000000" + num;
        return paddedNumber.substring(paddedNumber.length - 10);
    }

    protected async getChangeTrackerDetails(pid: string, modificationDate: string): Promise<Record<string, string>> {
        const core = this.config.solrCore;
        if (!this.config.vufindUrl) {
            console.warn("No VuFind URL configured; skipping change tracking indexing.");
            return {};
        }
        const url = this.config.vufindUrl + "/XSLT/Home?";
        const query =
            "method[]=getLastIndexed&method[]=getFirstIndexed&id=" +
            encodeURIComponent(pid) +
            "&core=" +
            encodeURIComponent(core) +
            "&date=" +
            encodeURIComponent(modificationDate);
        const response = (await http("get", url + query)).body;
        if (
            typeof response.results.getFirstIndexed !== "string" ||
            typeof response.results.getLastIndexed !== "string"
        ) {
            throw new Error(`Unexpected change tracker response: ${JSON.stringify(response)}.`);
        }
        return response.results;
    }

    async deletePid(pid: string): Promise<NeedleResponse> {
        return await this.solr.deleteRecord(this.config.solrCore, pid);
    }

    async indexPid(pid: string): Promise<NeedleResponse> {
        // Clear cache to ensure we retrieve fresh data from Fedora:
        this.solrCache.purgeFromCacheIfEnabled(pid);
        // Fetch and store latest details:
        this.lastIndexResults = await this.getFields(pid);
        // Send to Solr:
        return await this.solr.indexRecord(this.config.solrCore, this.lastIndexResults);
    }

    async getFields(pid: string): Promise<SolrFields> {
        // Collect hierarchy data
        const fedoraData = await this.fedoraDataCollector.getHierarchy(pid);

        // Start with basic data:
        const fields: SolrFields = {
            id: pid,
            record_format: "vudl",
            institution: this.config.institution,
            collection: this.config.collection,
            modeltype_str_mv: fedoraData.models,
            datastream_str_mv: fedoraData.fedoraDatastreams,
            hierarchytype: "",
            hierarchy_all_parents_str_mv: fedoraData.getAllParents(),
        };

        // Is this a hierarchy?
        if (fedoraData.models.includes("vudl-system:FolderCollection")) {
            fields.is_hierarchy_id = fedoraData.pid;
            fields.is_hierarchy_title = fedoraData.title;
        }

        // Add sequence/order data:
        const sequenceIndex = {};
        for (const sequence of fedoraData.sequences) {
            const [seqPid, seqNum] = sequence.split("#", 2);
            sequenceIndex[seqPid] = seqNum;
            const sequence_str = seqPid.replace(/:/g, "_");
            const dynamic_sequence_field_name = "sequence_" + sequence_str + "_str";
            fields[dynamic_sequence_field_name] = this.padNumber(seqNum);
        }

        // Process parent data (note that vufindParents makes some special exceptions for VuFind;
        // fedoraParents exactly maintains the hierarchy as represented in Fedora):
        const vufindParents: Array<FedoraDataCollection> = [];
        const fedoraParents: Array<FedoraDataCollection> = [];
        const hierarchySequences: Array<string> = [];
        for (const parent of fedoraData.parents) {
            // Fedora parents should directly reflect the repository without any
            // VuFind-specific filtering or adjustments:
            fedoraParents.push(parent);

            // If the object is a Data, the VuFind parentPID is the Resource it belongs
            // to (skip the List object):
            if (fedoraData.models.includes("vudl-system:DataModel")) {
                for (const grandParent of parent.parents) {
                    vufindParents.push(grandParent);
                    hierarchySequences.push(this.padNumber(sequenceIndex[grandParent.pid] ?? 0));
                }
            } else if (!this.config.topLevelPids.includes(pid)) {
                // ...for non-Data objects, store the immediate parent (Folder most likely)
                // as long as the current pid is not marked as a top-level one:
                vufindParents.push(parent);
                hierarchySequences.push(this.padNumber(sequenceIndex[parent.pid] ?? 0));
            }
        }
        const hierarchyTops: Array<FedoraDataCollection> = fedoraData.getAllHierarchyTops();
        if (hierarchyTops.length > 0) {
            fields.hierarchy_top_id = [];
            fields.hierarchy_top_title = [];
            for (const top of hierarchyTops) {
                if (!fields.hierarchy_top_id.includes(top.pid)) {
                    fields.hierarchy_top_id.push(top.pid);
                    fields.hierarchy_top_title.push(top.title);
                }
            }
        }
        fields.fedora_parent_id_str_mv = fedoraParents.map((parent) => parent.pid);
        if (vufindParents.length > 0) {
            // This is what we are collapsing on:
            fields.hierarchy_first_parent_id_str = fedoraData.models.includes("vudl-system:DataModel")
                ? vufindParents[0].pid
                : pid;
            fields.hierarchy_browse = [];
            fields.hierarchy_parent_id = [];
            fields.hierarchy_parent_title = [];
            for (const parent of vufindParents) {
                if (!fields.hierarchy_parent_id.includes(parent.pid)) {
                    fields.hierarchy_browse.push(parent.title + "{{{_ID_}}}" + parent.pid);
                    fields.hierarchy_parent_id.push(parent.pid);
                    fields.hierarchy_parent_title.push(parent.title);
                }
            }
        } else {
            // If no parents, we still need to include the current object as
            // its own parent for field-collapsing purposes, and we can figure
            // out which top-level container is in play using RELS data.
            fields.hierarchy_first_parent_id_str = pid;
            if (typeof fields["relsext.isMemberOf_txt_mv"] !== "undefined") {
                fields.hierarchy_parent_id = (fields["relsext.isMemberOf_txt_mv"] as Array<string>).map((id) => {
                    return id.split("/").pop();
                });
            }
            fields.hierarchy_sequence = this.padNumber("0");
            // We don't have easy access to parent titles in this case, so we have
            // to look them up manually in Fedora. Perhaps this can be optimized or
            // simplified somehow...
            const titlePromises = ((fields.hierarchy_parent_id ?? []) as Array<string>).map(async (id) => {
                const currentObject = await this.fedoraDataCollector.getObjectData(id);
                return currentObject.title;
            });
            fields.hierarchy_parent_title = await Promise.all(titlePromises);
        }
        if (hierarchySequences.length > 0) {
            fields.hierarchy_sequence_sort_str = hierarchySequences[0] ?? this.padNumber("0");
            fields.hierarchy_sequence = hierarchySequences;
        }

        // Load all the Dublin Core data into dynamic fields AND allfields:
        fields.allfields = [];
        for (const field in fedoraData.metadata) {
            const fieldName = field.replace(/:/g, ".") + "_txt_mv";
            fields[fieldName] = fedoraData.metadata[field];
            fields.allfields = fields.allfields.concat(fedoraData.metadata[field]);
        }

        // This map copies existing values as-is to other fields:
        const copyFields = {
            author: "dc.creator_txt_mv",
            author2: "dc.contributor_txt_mv",
            dc_collection_str_mv: "dc.collection_txt_mv", // possibly unused
            dc_source_str_mv: "dc.source_txt_mv",
            format: "dc.format_txt_mv",
            publisher: "dc.publisher_txt_mv",
            publisher_str_mv: "dc.publisher_txt_mv",
            series: "dc.relation_txt_mv",
            topic: "dc.subject_txt_mv",
            topic_facet: "dc.subject_txt_mv",
            topic_str_mv: "dc.subject_txt_mv",
        };
        for (const field in copyFields) {
            if (typeof fields[copyFields[field]] !== "undefined") {
                fields[field] = fields[copyFields[field]];
            }
        }

        // This map copies the first value from existing fields to
        // new fields:
        const firstOnlyFields = {
            author_sort: "dc.creator_txt_mv",
            dc_date_str: "dc.date_txt_mv",
            dc_relation_str: "dc.relation_txt_mv",
            dc_title_str: "dc.title_txt_mv",
            description: "dc.description_txt_mv",
            title: "dc.title_txt_mv",
            title_full: "dc.title_txt_mv",
            title_short: "dc.title_txt_mv",
            title_sort: "dc.title_txt_mv",
        };
        for (const field in firstOnlyFields) {
            if (typeof fields[firstOnlyFields[field]] !== "undefined") {
                fields[field] = fields[firstOnlyFields[field]][0];
            }
        }

        // This map copies all values AFTER the first to new fields:
        const secondaryValueFields = {
            title_alt: "dc.title_txt_mv",
        };
        for (const field in secondaryValueFields) {
            if (
                typeof fields[secondaryValueFields[field]] !== "undefined" &&
                fields[secondaryValueFields[field]].length > 1
            ) {
                fields[field] = fields[secondaryValueFields[field]].slice(1);
            }
        }

        // If this is a data model, we want to pull the date from its parent.
        const dateString = fedoraData.models.includes("vudl-system:DataModel")
            ? (vufindParents[0]?.metadata["dc:date"] ?? [])[0] ?? ""
            : (fields["dc.date_txt_mv"] ?? [])[0] ?? "";
        const strippedDate = parseInt(dateString.substring(0, 4));
        if (strippedDate > this.config.minimumValidYear) {
            fields.publishDate = String(strippedDate);
            fields.publishDateSort = String(strippedDate);
            fields.normalized_sort_date = DateSanitizer.sanitize(dateString);
        }

        if (typeof fields["dc.language_txt_mv"] !== "undefined") {
            fields.language = (fields["dc.language_txt_mv"] as Array<string>).map((lang) => {
                return this.config.languageMap[lang] ?? lang;
            });
        }

        if (typeof fields["title"] !== "undefined") {
            // If we have a title, generate a sort-friendly version:
            let sortTitle = (fields["title"] as string).toLowerCase();
            for (const article of this.config.articlesToStrip) {
                if (sortTitle.substring(0, article.length) === article) {
                    sortTitle = sortTitle.substring(article.length);
                    break;
                }
            }
            fields.title_sort = sortTitle.trim();
            if (!fedoraData.models.includes("vudl-system:DataModel")) {
                fields.collection_title_sort_str = fields.title_sort;
            }
        }
        // Fedora 3 stored some data in Fedora object XML and some in separate RELS-EXT datastreams.
        // Legacy VuDL indexed these two data sources using different prefixes. For stability of legacy
        // queries, we retain this prefix separation, using the table below to identify the former
        // RELS-EXT fields and defaulting to the "fgs." prefix for everything else.
        const prefixes = {
            hasLegacyURL: "relsext",
            hasModel: "relsext",
            itemID: "relsext",
            isMemberOf: "relsext",
            sequence: "relsext",
            sortOn: "relsext",
        };
        for (const field in fedoraData.fedoraDetails) {
            const prefix = prefixes[field] ?? "fgs";
            const fieldName = prefix + "." + field + "_txt_mv";
            fields[fieldName] = fedoraData.fedoraDetails[field];
        }

        fields.has_order_str = ((fields["relsext.sortOn_txt_mv"] ?? [])[0] ?? "title") === "custom" ? "yes" : "no";

        const agents = await fedoraData.datastreamDetails.getAgents();
        for (const field in agents) {
            const fieldName = "agent." + field + "_txt_mv";
            fields[fieldName] = agents[field];
        }

        const license = await fedoraData.getLicense();
        if (license !== null) {
            fields["license.mdRef_str"] = license;
        }
        if ((fields["license.mdRef_str"] ?? null) === "http://digital.library.villanova.edu/copyright.html") {
            fields.license_str = "protected";
        }
        fields.has_thumbnail_str = fedoraData.fedoraDatastreams.includes("THUMBNAIL") ? "true" : "false";
        if (fields.has_thumbnail_str === "true") {
            fields.THUMBNAIL_contentDigest_digest_str = await fedoraData.getThumbnailHash("md5");
        }

        // FITS details:
        const fileSize = await fedoraData.getFileSize();
        if (fileSize !== null) {
            fields.sizebytes_str = fileSize;
        }
        const imageHeight = await fedoraData.getImageHeight();
        if (imageHeight !== null) {
            fields.height_str = imageHeight;
        }
        const imageWidth = await fedoraData.getImageWidth();
        if (imageWidth !== null) {
            fields.width_str = imageWidth;
        }
        const mimetype = await fedoraData.getMimeType();
        if (mimetype.length > 0) {
            fields.mime_str_mv = mimetype;
        }

        // Full text:
        const fullText = await fedoraData.getFullText();
        if (fullText.length > 0) {
            fields.fulltext = fullText;
        }

        // Change tracker details:
        const lastModified =
            typeof fields["fgs.lastModifiedDate_txt_mv"] !== "undefined" &&
            fields["fgs.lastModifiedDate_txt_mv"].length > 0
                ? fields["fgs.lastModifiedDate_txt_mv"][0]
                : "1900-01-01T00:00:00Z";
        const change = await this.getChangeTrackerDetails(pid, lastModified);
        if (change.getFirstIndexed ?? "") {
            fields.first_indexed = change.getFirstIndexed;
        }
        if (change.getLastIndexed ?? "") {
            fields.last_indexed = change.getLastIndexed;
        }

        return fields;
    }

    public getLastIndexResults(): SolrFields | null {
        return this.lastIndexResults;
    }
}

export default SolrIndexer;
