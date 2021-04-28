import Fedora from "./Fedora";
import FedoraData from "../models/FedoraData";
import HierarchyCollector from "./HierarchyCollector";
const xpath = require("xpath");

interface SolrFields {
    [key: string]: string | Array<string>;
}

class SolrIndexer {
    hierarchyCollector: HierarchyCollector;

    constructor() {
        // Make Fedora connection
        let fedora = new Fedora();
        // TODO: make configurable
        let topPids = ["vudl:1", "vudl:3"];
        this.hierarchyCollector = new HierarchyCollector(fedora, topPids);
    }

    protected padNumber(num: string) {
        // Yes, I wrote a left_pad function.
        let paddedNumber = "0000000000" + num;
        return paddedNumber.substr(paddedNumber.length - 10);
    }

    async getFields(pid: string): Promise<SolrFields> {
        // Collect hierarchy data
        let fedoraData = await this.hierarchyCollector.getHierarchy(pid);

        // Start with basic data:
        let fields: SolrFields = {
            id: pid,
            modeltype_str_mv: fedoraData.models,
            datastream_str_mv: fedoraData.fedoraDatastreams,
            hierarchytype: null,
            hierarchy_all_parents_str_mv: fedoraData.getAllParents()
        };

        // Is this a hierarchy?
        if (fedoraData.models.includes('vudl-system:FolderCollection')) {
            fields.is_hierarchy_id = fedoraData.pid;
            fields.is_hierarchy_title = fedoraData.title;
        }

        // Add sequence/order data:
        for (let sequence of fedoraData.sequences) {
            let seqPid: string, seqNum: string;
            [seqPid, seqNum] = sequence.split('#', 2);
            let sequence_str = seqPid.replace(":", "_");
            let dynamic_sequence_field_name = 'sequence_' + sequence_str + '_str';
            fields[dynamic_sequence_field_name] = this.padNumber(seqNum);
        }
        fields.has_order_str = 'TODO';

        // Process parent data:
        let hierarchyParents: Array<FedoraData> = [];
        let hierarchySequences: Array<string> = [];
        for (let parent of fedoraData.parents) {
            // If the object is a Data, the parentPID is the Resource it belongs
            // to (skip the List object):
            if (fedoraData.models.includes('vudl-system:DataModel')) {
                hierarchyParents = hierarchyParents.concat(parent.parents);
            } else {
                // ...else it is the immediate parent (Folder most likely):
                hierarchyParents.push(parent);
            }

            // TODO: fill in hierarchySequences.
        }
        var hierarchyTops: Array<FedoraData> = fedoraData.getAllHierarchyTops();
        if (hierarchyTops.length > 0) {
            fields.hierarchy_top_id = [];
            fields.hierarchy_top_title = [];
            for (let top of hierarchyTops) {
                if (!fields.hierarchy_top_id.includes(top.pid)) {
                    fields.hierarchy_top_id.push(top.pid);
                    fields.hierarchy_top_title.push(top.title);
                }
            }
        }
        if (hierarchyParents.length > 0) {
            fields.hierarchy_first_parent_id_str = hierarchyParents[0].pid;
            fields.hierarchy_browse = [];
            fields.hierarchy_parent_id = [];
            fields.hierarchy_parent_title = [];
            for (let parent of hierarchyParents) {
                if (!fields.hierarchy_parent_id.includes(parent.pid)) {
                    fields.hierarchy_browse.push(parent.title + "{{{_ID_}}}" + parent.pid);
                    fields.hierarchy_parent_id.push(parent.pid);
                    fields.hierarchy_parent_title.push(parent.title);
                }
            }
        }
        if (hierarchySequences.length > 0) {
            // TODO: populate hierarchy_sequence_sort_str
            fields.hierarchy_sequence = hierarchySequences;
        }

        // Load all the Dublin Core data:
        for (let field in fedoraData.metadata) {
            let fieldName = field.replace(':', '.') + '_txt_mv';
            fields[fieldName] = fedoraData.metadata[field];
        }

        // This map copies existing values as-is to other fields:
        let copyFields = {
            "author": "dc.creator_txt_mv",
            "author2": "dc.contributor_txt_mv",
            "description": "dc.description_txt_mv",
            "format": "dc.format_txt_mv",
            "publisher": "dc.publisher_txt_mv",
            "publisher_str_mv": "dc.publisher_txt_mv",
            "series": "dc.relation_txt_mv",
            "topic": "dc.subject_txt_mv",
            "topic_str_mv": "dc.subject_txt_mv",
        };
        for (let field in copyFields) {
            if (typeof fields[copyFields[field]] !== "undefined") {
                fields[field] = fields[copyFields[field]];
            }
        }

        // This map copies the first value from existing fields to
        // new fields:
        let firstOnlyFields = {
            "dc_date_str": "dc.date_txt_mv",
            "dc_relation_str": "dc.relation_txt_mv",
            "dc_title_str": "dc.title_txt_mv",
            "publishDate": "dc.date_txt_mv",
            "publishDateSort": "dc.date_txt_mv",
            "title": "dc.title_txt_mv",
            "title_full": "dc.title_txt_mv",
            "title_short": "dc.title_txt_mv",
            "title_sort": "dc.title_txt_mv",
        };
        for (let field in firstOnlyFields) {
            if (typeof fields[firstOnlyFields[field]] !== "undefined") {
                fields[field] = fields[firstOnlyFields[field]][0];
            }
        }

        // This map copies all values AFTER the first to new fields:
        let secondaryValueFields = {
            "title_alt": "dc.title_txt_mv",
        };
        for (let field in secondaryValueFields) {
            if (typeof fields[secondaryValueFields[field]] !== "undefined"
                && fields[secondaryValueFields[field]].length > 1
            ) {
                fields[field] = fields[secondaryValueFields[field]].slice(1);
            }
        }
    
        for (let field in fedoraData.relations) {
            let fieldName = "relsext." + field + "_txt_mv";
            fields[fieldName] = fedoraData.relations[field];
        }

        for (let field in fedoraData.fedoraDetails) {
            let fieldName = "fgs." + field + "_txt_mv";
            fields[fieldName] = fedoraData.fedoraDetails[field];
        }

        return fields;
    }
}

export default SolrIndexer;
