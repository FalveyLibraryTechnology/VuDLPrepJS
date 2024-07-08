import { DC } from "./Fedora";
import { DOMParser } from "@xmldom/xmldom";
import xpath = require("xpath");
import { Agent } from "./interfaces";

class MetadataExtractor {
    private static instance: MetadataExtractor;
    xmlParser: DOMParser;

    constructor(xmlParser: DOMParser) {
        this.xmlParser = xmlParser;
    }

    public static getInstance(): MetadataExtractor {
        if (!MetadataExtractor.instance) {
            MetadataExtractor.instance = new MetadataExtractor(new DOMParser());
        }
        return MetadataExtractor.instance;
    }

    /**
     * Extract Dublin Core metadata from XML.
     *
     * @param dc Dublin core XML
     * @returns  Record mapping field names to values
     */
    public extractMetadata(dc: DC): Record<string, Array<string>> {
        const metadata: Record<string, Array<string>> = {};
        (dc?.children ?? []).forEach((field) => {
            if (typeof metadata[field.name] === "undefined") {
                metadata[field.name] = [];
            }
            metadata[field.name].push(field.value);
        });
        return metadata;
    }

    /**
     * Extract values from RDF XML.
     *
     * @param xml        XML to process
     * @param namespaces Namespace definitions
     * @param xpathQuery Xpath query to use for extraction
     * @returns          Record containing extracted fields to values
     */
    protected extractRDFXML(
        xml: Document,
        namespaces: Record<string, string>,
        xpathQuery: string,
    ): Record<string, Array<string>> {
        const rdfXPath = xpath.useNamespaces(namespaces);
        const relations: Record<string, Array<string>> = {};
        rdfXPath(xpathQuery, xml).forEach((relation: Node) => {
            let values = rdfXPath("text()", relation) as Array<Node>;
            // If there's a namespace on the node name, strip it:
            const nodeName = relation.nodeName.split(":").pop();
            if (values.length === 0) {
                values = rdfXPath("./@rdf:resource", relation) as Array<Node>;
            }
            if (values.length > 0) {
                if (typeof relations[nodeName] === "undefined") {
                    relations[nodeName] = [];
                }
                relations[nodeName].push(values[0].nodeValue);
            }
        });
        return relations;
    }

    /**
     * Extract key details from the description of a Fedora 6 container object.
     *
     * @param RDF RDF XML from Fedora 6 (describing a container)
     * @returns   Map of extracted data
     */
    public extractFedoraDetails(RDF: string): Record<string, Array<string>> {
        const RDF_XML = this.xmlParser.parseFromString(RDF, "text/xml");
        // We want to extract all values from the following namespaces, so we'll define the list
        // and use it to build an Xpath query to fetch everything:
        const namespaces = {
            rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            fedora: "http://fedora.info/definitions/v4/repository#",
            "fedora3-model": "info:fedora/fedora-system:def/model#",
            "fedora3-relations": "info:fedora/fedora-system:def/relations-external#",
            "fedora3-view": "info:fedora/fedora-system:def/view#",
            oai: "http://www.openarchives.org/OAI/2.0/",
            vudl: "http://vudl.org/relationships#",
            "vudl-legacy": "http://digital.library.villanova.edu/rdf/relations#",
        };
        const toXpath = function (ns) {
            return "//rdf:Description/" + ns + ":*";
        };
        const xpath = Object.keys(namespaces).map(toXpath).join("|");
        const details = this.extractRDFXML(RDF_XML, namespaces, xpath);
        // The new (F6) created and lastModified properties should take
        // precedence over the legacy (F3) createdDate and lastModifiedDate
        // properties when present.
        if (typeof details.created !== "undefined") {
            details.createdDate = details.created;
            delete details.created;
        }
        if (typeof details.lastModified !== "undefined") {
            details.lastModifiedDate = details.lastModified;
            delete details.lastModified;
        }
        return details;
    }

    /**
     * Extract a list of binary datastreams from container RDF.
     *
     * @param RDF RDF XML from Fedora 6 (describing a container)
     * @returns   List of datastreams (binaries) inside the container
     */
    public extractFedoraDatastreams(RDF: string): Array<string> {
        const RDF_XML = this.xmlParser.parseFromString(RDF, "text/xml");
        const raw =
            this.extractRDFXML(
                RDF_XML,
                {
                    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                    ldp: "http://www.w3.org/ns/ldp#",
                },
                "//ldp:contains",
            )["contains"] ?? [];
        return raw.map((ds) => {
            return ds.split("/").pop();
        });
    }

    /**
     * Extract a URI from license XML data.
     *
     * @param XML LICENSE datastream XML
     * @returns   License URI
     */
    public extractLicense(XML: string): string {
        const parsedXml = this.xmlParser.parseFromString(XML, "text/xml");
        const namespaces = {
            rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            METS: "http://www.loc.gov/METS/",
            xlink: "http://www.w3.org/1999/xlink",
        };
        const rdfXPath = xpath.useNamespaces(namespaces);
        let license = null;
        rdfXPath("//@xlink:href", parsedXml).forEach((relation: Node) => {
            license = relation.nodeValue;
        });
        return license;
    }

    /**
     * Extract agent names from the AGENTS datastream.
     *
     * @param xml AGENTS datastream XML
     * @returns   List of agent names
     */
    public extractAgents(xml: string): Record<string, Array<string>> {
        const RDF_XML = this.xmlParser.parseFromString(xml, "text/xml");
        return this.extractRDFXML(
            RDF_XML,
            {
                rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                METS: "http://www.loc.gov/METS/",
            },
            "//METS:agent/*",
        );
    }
    /**
     * Extract agent details from the AGENTS datastream.
     *
     * @param xml AGENTS datastream XML
     * @returns   List of agent details
     */
    public getAgents(xml: string): Array<Agent> {
        const parsedXml = this.xmlParser.parseFromString(xml, "text/xml");
        const namespaces = {
            rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            METS: "http://www.loc.gov/METS/",
        };
        const rdfXPath = xpath.useNamespaces(namespaces);

        return rdfXPath("//METS:agent", parsedXml).reduce((acc, relation: Element) => {
            const agent = {
                role: "",
                type: "",
                name: "",
                notes: [],
            };
            Object.values(relation.attributes).forEach((attr) => {
                if (attr.nodeName == "ROLE") {
                    agent.role = attr.nodeValue;
                }
                if (attr.nodeName == "TYPE") {
                    agent.type = attr.nodeValue;
                }
            });
            Object.values(relation.childNodes).forEach((childNode) => {
                if (childNode.nodeName == "METS:name") {
                    agent.name = childNode?.firstChild?.nodeValue || "";
                }
                if (childNode.nodeName == "METS:note") {
                    agent.notes.push(childNode?.firstChild?.nodeValue || "");
                }
            });
            return [...acc, agent];
        }, []);
    }

    public extractAgentsAttributes(xml: string): Record<string, string> {
        const parsedXml = this.xmlParser.parseFromString(xml, "text/xml");
        const namespaces = {
            rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            METS: "http://www.loc.gov/METS/",
        };
        const rdfXPath = xpath.useNamespaces(namespaces);

        return rdfXPath("//METS:metsHdr", parsedXml).reduce(
            (acc, relation: Element) => {
                Object.values(relation.attributes).forEach((attr) => {
                    if (attr.nodeName == "CREATEDATE") {
                        acc.createDate = attr.nodeValue;
                    }
                    if (attr.nodeName == "LASTMODDATE") {
                        acc.modifiedDate = attr.nodeValue;
                    }
                    if (attr.nodeName == "RECORDSTATUS") {
                        acc.recordStatus = attr.nodeValue;
                    }
                });
                return acc;
            },
            { createDate: "", modifiedDate: "", recordStatus: "" },
        );
    }

    /**
     * Extract process metadata details from the PROCESS-MD datastream.
     *
     * @param xml PROCESS-MD datastream XML
     * @returns   Process details
     */
    public getProcessMetadata(xml: string): Record<string, unknown> {
        const taskNodeMap = {
            task_label: "label",
            task_description: "description",
            task_sequence: "sequence",
            task_individual: "individual",
            tool_label: "toolLabel",
            tool_description: "toolDescription",
            tool_make: "toolMake",
            tool_version: "toolVersion",
            tool_serial_number: "toolSerialNumber",
        };
        const topNodeMap = {
            process_creator: "processCreator",
            process_datetime: "processDateTime",
            process_label: "processLabel",
            process_organization: "processOrganization",
        };
        const parsedXml = this.xmlParser.parseFromString(xml, "text/xml");
        const namespaces = {
            PMD: "http://www.loc.gov/PMD",
        };
        const xpathProcessor = xpath.useNamespaces(namespaces);
        const tasks = xpathProcessor("//PMD:task", parsedXml).map((task: Element) => {
            const parsedTask = xpathProcessor("*|PMD:tool/*", task).reduce((acc, current: Element) => {
                const target = taskNodeMap[current.localName] ?? "";
                if (target.length > 0) {
                    acc[target] = current.textContent;
                }
                return acc;
            }, {});
            Object.values(task.attributes).forEach((attr) => {
                if (attr.nodeName == "ID") {
                    parsedTask["id"] = attr.nodeValue;
                }
            });
            return parsedTask;
        });
        return xpathProcessor("//PMD:DIGIPROVMD/*", parsedXml).reduce(
            (acc, current: Element) => {
                const target = topNodeMap[current.localName] ?? "";
                if (target.length > 0) {
                    acc[target] = current.textContent;
                }
                return acc;
            },
            { tasks, processCreator: "", processDateTime: "", processLabel: "", processOrganization: "" },
        );
    }

    /**
     * Extract useful details from FITS technical metadata.
     *
     * @param xml FITS technical metadata
     * @returns   Map of extracted details
     */
    public extractFitsData(xml: string): Record<string, Array<string>> {
        const RDF_XML = this.xmlParser.parseFromString(xml, "text/xml");
        const namespaces = {
            rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            fits: "http://hul.harvard.edu/ois/xml/ns/fits/fits_output",
        };
        const details = this.extractRDFXML(
            RDF_XML,
            namespaces,
            "//fits:fileinfo/fits:size|//fits:imageWidth|//fits:imageHeight",
        );
        details.mimetype = [];
        const fitsXPath = xpath.useNamespaces(namespaces);
        fitsXPath("//fits:identity/@mimetype", RDF_XML).forEach((relation: Node) => {
            details.mimetype.push(relation.nodeValue);
        });
        return details;
    }

    /**
     * Extract information about a binary thumbnail object.
     *
     * @param xml Fedora 6 RDF XML describing a thumbnail binary
     * @returns   Map of extracted relevant details
     */
    public extractThumbnailDetails(xml: string): Record<string, Array<string>> {
        const RDF_XML = this.xmlParser.parseFromString(xml, "text/xml");
        return this.extractRDFXML(
            RDF_XML,
            {
                rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                premis: "http://www.loc.gov/premis/rdf/v1#",
            },
            "//premis:*",
        );
    }

    public extractEbuCore(xml: string, xpathQuery: string): Record<string, Array<string>> {
        const RDF_XML = this.xmlParser.parseFromString(xml, "text/xml");
        return this.extractRDFXML(
            RDF_XML,
            {
                ebucore: "http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#",
            },
            xpathQuery,
        );
    }
}

export default MetadataExtractor;
