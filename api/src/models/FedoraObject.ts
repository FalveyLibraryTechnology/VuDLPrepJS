import fs = require("fs");
import winston = require("winston");
import xmlescape = require("xml-escape");
import Config from "./Config";
import { DatastreamParameters, Fedora } from "../services/Fedora";
import FedoraDataCollector from "../services/FedoraDataCollector";
import { execSync } from "child_process";
import { Agent } from "../services/interfaces";

export interface ObjectParameters {
    label?: string;
    format?: string;
    encoding?: string;
    namespace?: string;
    ownerId?: string;
    logMessage?: string;
    ignoreMime?: boolean;
    lastModifiedDate?: string;
    state?: string;
}

export class FedoraObject {
    public pid: string;
    public parentPid: string = null;
    public title: string;
    protected config: Config;
    protected fedora: Fedora;
    protected logger: winston.Logger;
    protected fedoraDataCollector: FedoraDataCollector;

    constructor(
        pid: string,
        config: Config,
        fedora: Fedora,
        fedoraDataCollector: FedoraDataCollector,
        logger: winston.Logger = null,
    ) {
        this.pid = pid;
        this.config = config;
        this.fedora = fedora;
        this.logger = logger;
        this.fedoraDataCollector = fedoraDataCollector;
    }

    public static build(pid: string, logger: winston.Logger = null, config: Config = null): FedoraObject {
        const fedora = Fedora.getInstance();
        // Share logger with the Fedora service so we can send messages to the right place.
        if (logger) {
            fedora.setLogger(logger);
        }
        return new FedoraObject(pid, config ?? Config.getInstance(), fedora, FedoraDataCollector.getInstance(), logger);
    }

    get namespace(): string {
        return this.config.pidNamespace;
    }

    async addDatastream(
        id: string,
        params: DatastreamParameters,
        data: string | Buffer,
        expectedStatus = [201],
    ): Promise<void> {
        this.log(
            params.logMessage ?? "Adding datastream " + id + " to " + this.pid + " with " + data.length + " bytes",
        );
        await this.fedora.addDatastream(this.pid, id, params, data, expectedStatus);
    }

    async deleteDatastream(stream: string): Promise<void> {
        await this.fedora.deleteDatastream(this.pid, stream);
        await this.deleteDatastreamTombstone(stream);
    }

    async deleteDatastreamTombstone(stream: string): Promise<void> {
        await this.fedora.deleteDatastreamTombstone(this.pid, stream);
    }

    async addDatastreamFromFile(filename: string, stream: string, mimeType: string): Promise<void> {
        await this.addDatastreamFromStringOrBuffer(fs.readFileSync(filename), stream, mimeType, [201]);
    }

    async updateDatastreamFromFile(filename: string, stream: string, mimeType: string): Promise<void> {
        await this.addDatastreamFromStringOrBuffer(fs.readFileSync(filename), stream, mimeType, [201, 204]);
    }

    async addDatastreamFromStringOrBuffer(
        contents: string | Buffer,
        stream: string,
        mimeType: string,
        expectedStatus = [201],
    ): Promise<void> {
        if (mimeType === "text/plain" && contents.length === 0) {
            contents = "\n"; // workaround for 500 error on empty OCR
        }
        const params: DatastreamParameters = {
            mimeType: mimeType,
            logMessage: "Initial Ingest addDatastream - " + stream,
        };
        await this.addDatastream(stream, params, contents, expectedStatus);
    }

    async addMasterMetadataDatastream(filename: string): Promise<void> {
        const params = {
            mimeType: "text/xml",
            logMessage: "Initial Ingest addDatastream - MASTER-MD",
        };
        const fitsXml = this.fitsMasterMetadata(filename);
        await this.addDatastream("MASTER-MD", params, fitsXml, [201, 204]);
    }

    async addRelationship(subject: string, predicate: string, obj: string, isLiteral = false): Promise<void> {
        this.log("Adding relationship " + [subject, predicate, obj].join(" ") + " to " + this.pid);
        return this.fedora.addRelationship(this.pid, subject, predicate, obj, isLiteral);
    }

    async addModelRelationship(model: string): Promise<void> {
        return this.addRelationship(
            "info:fedora/" + this.pid,
            "info:fedora/fedora-system:def/model#hasModel",
            "info:fedora/vudl-system:" + model,
        );
    }

    async addParentRelationship(parentPid: string): Promise<void> {
        return this.addRelationship(
            "info:fedora/" + this.pid,
            "info:fedora/fedora-system:def/relations-external#isMemberOf",
            "info:fedora/" + parentPid,
        );
    }

    async addSequenceRelationship(parentPid: string, position: number): Promise<void> {
        return this.addRelationship(
            "info:fedora/" + this.pid,
            "http://vudl.org/relationships#sequence",
            parentPid + "#" + position,
            true,
        );
    }

    async modifyLicense(stream: string, licenseKey: string): Promise<void> {
        const licenses = this.config.licenses;
        const url = licenses[licenseKey]?.uri;
        const licenseXml = `
            <METS:rightsMD xmlns:METS="http://www.loc.gov/METS/" ID="0">
                <METS:mdRef xmlns:xlink="http://www.w3.org/1999/xlink" LOCTYPE="URL" MDTYPE="OTHER" MIMETYPE="text/html" OTHERMDTYPE="HTML" xlink:href="${xmlescape(
                    url,
                )}">
                </METS:mdRef>
            </METS:rightsMD>
        `;
        await this.addDatastreamFromStringOrBuffer(licenseXml, stream, "text/xml", [201, 204]);
    }

    async modifyAgents(stream: string, agents: Array<Agent>, agentsAttributes: Record<string, string>): Promise<void> {
        const { createDate, recordStatus } = agentsAttributes;
        const agentsXml = agents.reduce((acc, agent) => {
            const { role, type, name, notes } = agent;
            const notesXml = notes.reduce((acc, note) => {
                return acc + `<METS:note>${xmlescape(note)}</METS:note>`;
            }, "");
            const agentXml = `<METS:agent ROLE="${xmlescape(role)}" TYPE="${xmlescape(type)}"><METS:name>${xmlescape(
                name,
            )}</METS:name>${notesXml.trim()}</METS:agent>`.trim();
            return acc + agentXml;
        }, "");
        const documentXml = `
            <?xml version="1.0" encoding="UTF-8"?>
            <METS:metsHdr xmlns:METS="http://www.loc.gov/METS/" CREATEDATE="${xmlescape(
                createDate || new Date().toISOString(),
            )}"${createDate ? ` LASTMODDATE="${xmlescape(new Date().toISOString())}"` : ""}${
                recordStatus ? ` RECORDSTATUS="${xmlescape(recordStatus)}"` : ""
            }>${agentsXml}</METS:metsHdr>
        `.trim();
        await this.addDatastreamFromStringOrBuffer(documentXml, stream, "text/xml", [201, 204]);
    }

    async addSortRelationship(sort: string): Promise<void> {
        return this.addRelationship("info:fedora/" + this.pid, "http://vudl.org/relationships#sortOn", sort, true);
    }

    async initialize(objectState: string, model: string, owner = "diglibEditor"): Promise<void> {
        // Determine model type -- everything should be either data or a collection:
        let modelType: string = null;
        if (Object.values(this.config.collectionModels).indexOf("vudl-system:" + model) > -1) {
            modelType = "CollectionModel";
        } else if (Object.values(this.config.dataModels).indexOf("vudl-system:" + model) > -1) {
            modelType = "DataModel";
        } else {
            throw new Error("Unknown model type: " + model);
        }
        this.log("Creating object " + this.pid + " with models CoreModel, " + modelType + ", " + model);
        // Create the object in Fedora:
        await this.fedora.createContainer(this.pid, this.title, objectState, owner);
        // Add the three layers of models -- core (always), the type (data/collection), and the specific model
        await this.addModelRelationship("CoreModel");
        await this.addModelRelationship(modelType);
        await this.addModelRelationship(model);
        // Some collection types always have specific sort orders:
        switch (model) {
            case "ListCollection":
                await this.addSortRelationship("custom");
                break;
            case "FolderCollection":
            case "ResourceCollection":
                await this.addSortRelationship("title");
                break;
        }
        // Attach parent if present:
        if (this.parentPid !== null) {
            await this.addParentRelationship(this.parentPid);
        }
    }

    async getDatastream(datastream: string, treatMissingAsEmpty = false): Promise<string> {
        return this.fedora.getDatastreamAsString(this.pid, datastream, treatMissingAsEmpty);
    }

    async getDatastreamAsBuffer(datastream: string): Promise<Buffer> {
        return this.fedora.getDatastreamAsBuffer(this.pid, datastream);
    }

    async getDatastreamMetadata(datastream: string): Promise<string> {
        return await this.fedora.getRdf(`${this.pid}/${datastream}/fcr:metadata`);
    }

    fitsMasterMetadata(filename: string): string {
        const targetXml = filename + ".fits.xml";
        if (!fs.existsSync(targetXml)) {
            const fitsCommand = this.config.fitsCommand + " -i " + filename + " -o " + targetXml;
            execSync(fitsCommand);
            if (!fs.existsSync(targetXml)) {
                throw new Error("FITS failed to create " + targetXml);
            }
        }
        return fs.readFileSync(targetXml).toString();
    }

    async putDatastream(
        id: string,
        params: DatastreamParameters,
        data: string,
        expectedStatus: Array<number>,
    ): Promise<void> {
        if (typeof params.dsLabel !== "undefined" || typeof params.dsState !== "undefined") {
            throw new Error("Unsupported parameter(s) passed to putDatastream()");
        }
        this.log(params.logMessage ?? "");
        await this.fedora.putDatastream(this.pid, id, params.mimeType, expectedStatus, data);
    }

    async createOrModifyDatastream(id: string, params: DatastreamParameters, data: string): Promise<void> {
        await this.putDatastream(id, params, data, [201, 204]);
    }

    async modifyDatastream(id: string, params: DatastreamParameters, data: string): Promise<void> {
        await this.putDatastream(id, params, data, [204]);
    }

    async modifyObjectLabel(title: string): Promise<void> {
        await this.fedora.modifyObjectLabel(this.pid, title);
    }

    log(message: string): void {
        if (this.logger && message.length > 0) {
            this.logger.info(message);
        }
    }

    async getSortOn(): Promise<string> {
        return (await this.fedoraDataCollector.getObjectData(this.pid)).sortOn;
    }
}
