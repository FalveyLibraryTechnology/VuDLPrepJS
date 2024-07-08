import Config from "../models/Config";
import { FedoraObject } from "../models/FedoraObject";
import FedoraCatalog from "./FedoraCatalog";
import { Agent } from "./interfaces";
import MetadataExtractor from "./MetadataExtractor";
import xmlescape = require("xml-escape");

class DatastreamManager {
    private static instance: DatastreamManager;
    fedoraCatalog: FedoraCatalog;
    config: Config;

    constructor(fedoraCatalog: FedoraCatalog, config: Config) {
        this.config = config;
        this.fedoraCatalog = fedoraCatalog;
    }

    static getInstance(): DatastreamManager {
        if (!DatastreamManager.instance) {
            DatastreamManager.instance = new DatastreamManager(FedoraCatalog.getInstance(), Config.getInstance());
        }
        return DatastreamManager.instance;
    }

    async getMetadata(pid: string, stream: string): Promise<string> {
        const fedoraObject = FedoraObject.build(pid);
        const xml = await fedoraObject.getDatastreamMetadata(stream);
        return xml;
    }

    async getMimeType(pid: string, stream: string): Promise<string> {
        const metadataExtractor = MetadataExtractor.getInstance();
        const xml = await this.getMetadata(pid, stream);
        const ebuNode = metadataExtractor.extractEbuCore(xml, "//ebucore:hasMimeType");
        return ebuNode?.hasMimeType?.[0] || "";
    }

    async downloadBuffer(pid: string, stream: string): Promise<Buffer> {
        const fedoraObject = FedoraObject.build(pid);
        return await fedoraObject.getDatastreamAsBuffer(stream);
    }

    async uploadFile(pid: string, stream: string, filepath: string, mimeType: string): Promise<void> {
        const fedoraObject = FedoraObject.build(pid);

        if (this.hasValidMimeType(stream, mimeType)) {
            try {
                await fedoraObject.updateDatastreamFromFile(filepath, stream, mimeType);
            } catch (error) {
                console.error(error);
                if (error?.name === "HttpError" && error.statusCode === 410) {
                    await fedoraObject.deleteDatastreamTombstone(stream);
                    await fedoraObject.updateDatastreamFromFile(filepath, stream, mimeType);
                }
            }
        } else {
            throw new Error(`Invalid mime type: ${mimeType}`);
        }
    }

    async uploadLicense(pid: string, stream: string, licenseKey: string): Promise<void> {
        const fedoraObject = FedoraObject.build(pid);
        await fedoraObject.modifyLicense(stream, licenseKey);
    }

    async uploadAgents(pid: string, stream: string, agents: Array<Agent>): Promise<void> {
        const fedoraObject = FedoraObject.build(pid);
        const xml = await fedoraObject.getDatastream(stream, true);
        const metadataExtractor = MetadataExtractor.getInstance();
        const agentsAttributes = xml
            ? metadataExtractor.extractAgentsAttributes(xml)
            : { createDate: "", modifiedDate: "", recordStatus: "" };
        await fedoraObject.modifyAgents(stream, agents, agentsAttributes);
    }

    async uploadDublinCoreMetadata(
        pid: string,
        stream: string,
        metadata: Record<string, Array<string>>,
    ): Promise<void> {
        const fedoraObject = FedoraObject.build(pid);
        // The metadata must always include the current PID:
        if (typeof metadata["dc:identifier"] === "undefined") {
            metadata["dc:identifier"] = [pid];
        } else if (!metadata["dc:identifier"].includes(pid)) {
            metadata["dc:identifier"].push(pid);
        }
        let contents = "";
        for (const field in metadata) {
            const xmlize = (value: string): string => {
                return `  <${field}>${xmlescape(value)}</${field}>\n`;
            };
            contents += metadata[field].map(xmlize).join("");
        }
        // Format an XML document and save it to the repository:
        const xml =
            '<oai_dc:dc xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">' +
            "\n" +
            contents +
            "</oai_dc:dc>\n";

        await fedoraObject.modifyDatastream(stream, { mimeType: "text/xml" }, xml);
        // Extract a title from the metadata and use it as the Fedora label:
        const title = (metadata["dc:title"] ?? [""])[0] ?? "";
        await fedoraObject.modifyObjectLabel(title);
    }

    async uploadProcessMetadata(pid: string, stream: string, metadata: Record<string, unknown>): Promise<void> {
        const fedoraObject = FedoraObject.build(pid);
        const tasks = ((metadata.tasks ?? []) as Array<Record<string, string>>)
            .map((task) => {
                return `    <DIGIPROVMD:task ID="${task.id ?? 1}">
        <DIGIPROVMD:task_label>${task.label ?? ""}</DIGIPROVMD:task_label>
        <DIGIPROVMD:task_description>${task.description ?? ""}</DIGIPROVMD:task_description>
        <DIGIPROVMD:task_sequence>${task.sequence ?? 1}</DIGIPROVMD:task_sequence>
        <DIGIPROVMD:task_individual>${task.individual ?? ""}</DIGIPROVMD:task_individual>
        <DIGIPROVMD:tool>
        <DIGIPROVMD:tool_label>${task.toolLabel ?? ""}</DIGIPROVMD:tool_label>
        <DIGIPROVMD:tool_description>${task.toolDescription ?? ""}</DIGIPROVMD:tool_description>
        <DIGIPROVMD:tool_make>${task.toolMake ?? ""}</DIGIPROVMD:tool_make>
        <DIGIPROVMD:tool_version>${task.toolVersion ?? ""}</DIGIPROVMD:tool_version>
        <DIGIPROVMD:tool_serial_number>${task.toolSerialNumber ?? ""}</DIGIPROVMD:tool_serial_number>
        </DIGIPROVMD:tool>
    </DIGIPROVMD:task>\n`;
            })
            .join("");
        // Format an XML document and save it to the repository:
        const xml =
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<DIGIPROVMD:DIGIPROVMD xmlns:DIGIPROVMD="http://www.loc.gov/PMD">\n' +
            tasks +
            `    <DIGIPROVMD:process_creator>${xmlescape(
                metadata.processCreator ?? "",
            )}</DIGIPROVMD:process_creator>\n` +
            `    <DIGIPROVMD:process_datetime>${xmlescape(
                metadata.processDateTime ?? "",
            )}</DIGIPROVMD:process_datetime>\n` +
            `    <DIGIPROVMD:process_label>${xmlescape(metadata.processLabel ?? "")}</DIGIPROVMD:process_label>\n` +
            `    <DIGIPROVMD:process_organization>${xmlescape(
                metadata.processOrganization ?? "",
            )}</DIGIPROVMD:process_organization>\n` +
            "</DIGIPROVMD:DIGIPROVMD>";

        await fedoraObject.createOrModifyDatastream(stream, { mimeType: "text/xml" }, xml);
    }

    async getLicenseKey(pid: string, stream: string): Promise<string> {
        const fedoraObject = FedoraObject.build(pid);
        const xml = await fedoraObject.getDatastream(stream);
        const metadataExtractor = MetadataExtractor.getInstance();
        const license = metadataExtractor.extractLicense(xml) || "";
        const licenseMapping = Object.entries(this.config.licenses).find((configLicense) => {
            return configLicense[1]?.uri == license;
        });
        return licenseMapping?.[0] || "";
    }

    async getAgents(pid: string, stream: string): Promise<Array<Agent>> {
        const fedoraObject = FedoraObject.build(pid);
        const xml = await fedoraObject.getDatastream(stream);
        const metadataExtractor = MetadataExtractor.getInstance();
        return metadataExtractor.getAgents(xml);
    }

    async getProcessMetadata(pid: string, stream: string): Promise<Record<string, unknown>> {
        const fedoraObject = FedoraObject.build(pid);
        const xml = await fedoraObject.getDatastream(stream);
        const metadataExtractor = MetadataExtractor.getInstance();
        return metadataExtractor.getProcessMetadata(xml);
    }

    async deleteDatastream(pid: string, stream: string): Promise<void> {
        const fedoraObject = FedoraObject.build(pid);
        await fedoraObject.deleteDatastream(stream);
    }

    hasValidMimeType(stream: string, mimeType: string): boolean {
        const mimeTypeHierarchy = mimeType.split("/");
        const allowedType = this.fedoraCatalog.getDatastreamMimetypes()?.[stream]?.mimetype?.allowedType;
        const allowedSubtypes = this.fedoraCatalog.getDatastreamMimetypes()?.[stream]?.mimetype?.allowedSubtypes;
        if (mimeTypeHierarchy.length == 2) {
            const [type, subtype] = mimeTypeHierarchy;
            return (
                allowedType &&
                allowedSubtypes &&
                (allowedType.includes(type) || allowedType.includes("*")) &&
                (allowedSubtypes.includes(subtype) || allowedSubtypes.includes("*"))
            );
        }
        return false;
    }
}

export default DatastreamManager;
