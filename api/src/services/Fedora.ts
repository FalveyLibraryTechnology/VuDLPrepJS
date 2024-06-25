import Config from "../models/Config";
import http = require("needle");
import N3 = require("n3");
import crypto = require("crypto");
const { DataFactory } = N3;
const { namedNode, literal } = DataFactory;
import { NeedleResponse } from "./interfaces";
import xmlescape = require("xml-escape");
import { HttpError } from "../models/HttpError";
import winston = require("winston");
import SolrCache from "./SolrCache";

export interface DatastreamParameters {
    dsLabel?: string;
    dsState?: string;
    mimeType?: string;
    linkHeader?: string;
    logMessage?: string;
}

interface Attributes {
    [key: string]: string;
}

export interface DC {
    name: string;
    value: string;
    attributes: Attributes;
    children: Array<DC>;
}

export class Fedora {
    private static instance: Fedora;
    protected logger: winston.Logger = null;
    config: Config;
    cache: SolrCache;

    constructor(config: Config, cache: SolrCache) {
        this.config = config;
        this.cache = cache;
    }

    public static getInstance(): Fedora {
        if (!Fedora.instance) {
            Fedora.instance = new Fedora(Config.getInstance(), SolrCache.getInstance());
        }
        return Fedora.instance;
    }

    /**
     * Make authenticated request to Fedora
     *
     * @param method Request method
     * @param _path URL
     * @param data POST data
     * @param _options Additional needle options
     */
    protected _request(
        method = "get",
        _path = "/",
        data: string | Buffer = null,
        _options: Record<string, unknown> = {},
    ): Promise<NeedleResponse> {
        const path = _path[0] == "/" ? _path.slice(1) : _path;
        const url = this.config.restBaseUrl + "/" + path;

        // Basic Auth
        const auth = {
            username: this.config.fedoraUsername,
            password: this.config.fedoraPassword,
        };
        const options = Object.assign({}, auth, _options);
        return http(method, url, data, options);
    }

    /**
     * Get RDF about a PID in Fedora
     *
     * @param pid PID to look up
     */
    async getRdf(pid: string): Promise<string> {
        const options = {
            parse_response: false,
            headers: { Accept: "application/rdf+xml" },
        };
        const result = await this._request("get", pid, null, options);
        if (result.statusCode !== 200) {
            throw new Error("Unexpected status code: " + result.statusCode);
        }
        return result.body.toString();
    }

    async getDatastreamAsString(pid: string, datastream: string, treatMissingAsEmpty = false): Promise<string> {
        return (await this.getDatastreamAsBuffer(pid, datastream, treatMissingAsEmpty)).toString();
    }

    async getDatastreamAsBuffer(pid: string, datastream: string, treatMissingAsEmpty = false): Promise<Buffer> {
        const response = await this.getDatastream(pid, datastream);
        if (response.statusCode === 200) {
            return response.body;
        }

        if (response.statusCode === 404 && treatMissingAsEmpty) {
            return Buffer.from("");
        } else {
            throw new Error("Unexpected response for " + pid + "/" + datastream + ": " + response.statusCode);
        }
    }

    /**
     * Delete datastream from Fedora
     *
     * @param pid Record id
     * @param datastream Which stream to request
     * @param parse Parse JSON (true) or return raw (false, default)
     */
    async deleteDatastream(
        pid: string,
        datastream: string,
        requestOptions = { parse_response: false },
    ): Promise<NeedleResponse> {
        this.cache.purgeFromCacheIfEnabled(pid);
        return await this._request(
            "delete",
            `${pid}/${datastream}`,
            null, // Data
            requestOptions,
        );
    }

    /**
     * Purge datastream from Fedora by removing its tombstone
     *
     * @param pid Record id
     * @param datastream Which stream to request
     * @param requestOptions Parse JSON (true) or return raw (false, default)
     */
    async deleteDatastreamTombstone(
        pid: string,
        datastream: string,
        requestOptions = { parse_response: false },
    ): Promise<NeedleResponse> {
        this.cache.purgeFromCacheIfEnabled(pid);
        return await this._request(
            "delete",
            `${pid}/${datastream}/fcr:tombstone`,
            null, // Data
            requestOptions,
        );
    }

    /**
     * Delete object from Fedora
     *
     * @param pid Record id
     * @param parse Parse JSON (true) or return raw (false, default)
     */
    async deleteObject(pid: string, requestOptions = { parse_response: false }): Promise<NeedleResponse> {
        this.cache.purgeFromCacheIfEnabled(pid);
        return await this._request(
            "delete",
            pid,
            null, // Data
            requestOptions,
        );
    }

    /**
     * Purge object from Fedora by removing its tombstone
     *
     * @param pid Record id
     * @param requestOptions Parse JSON (true) or return raw (false, default)
     */
    async deleteObjectTombstone(pid: string, requestOptions = { parse_response: false }): Promise<NeedleResponse> {
        this.cache.purgeFromCacheIfEnabled(pid);
        return await this._request(
            "delete",
            `${pid}/fcr:tombstone`,
            null, // Data
            requestOptions,
        );
    }

    /**
     * Get datastream from Fedora
     *
     * @param pid Record id
     * @param datastream Which stream to request
     * @param parse Parse JSON (true) or return raw (false, default)
     */
    async getDatastream(
        pid: string,
        datastream: string,
        requestOptions = { parse_response: false },
    ): Promise<NeedleResponse> {
        return await this._request(
            "get",
            pid + "/" + datastream,
            null, // Data
            requestOptions,
        );
    }

    /**
     * Get DC datastream from Fedora
     *
     * Cast to DC type
     *
     * @param pid Record id
     */
    async getDublinCore(pid: string): Promise<DC> {
        const requestOptions = { parse_response: true };
        const response = await this.getDatastream(pid, "DC", requestOptions);
        // If the DC doesn't exist yet, return an empty object.
        if (response.statusCode === 404) {
            return <DC>{};
        }
        if (response.statusCode !== 200) {
            throw new Error("Unexpected status code: " + response.statusCode);
        }
        return <DC>response.body;
    }

    /**
     * Call the callback, and retry if it yields a 409 response. Number of retries
     * is based on configuration in vudl.ini (and retries can be disabled by setting
     * retry count to 0).
     *
     * @param callback Callback to attempt
     */
    async callWith409Retry(callback: () => Promise<void>): Promise<void> {
        const maxRetries = this.config.max409Retries;
        let retries = 0;
        while (retries <= maxRetries) {
            try {
                await callback();
                return;
            } catch (e) {
                if (e.statusCode ?? null === 409) {
                    retries++;
                    if (retries <= maxRetries) {
                        this.log(`Encountered 409 error; retry #${retries}...`);
                    } else {
                        throw e;
                    }
                } else {
                    throw e;
                }
            }
        }
    }

    /**
     * Write a datastream to Fedora.
     *
     * @param pid            Object containing datastream
     * @param stream         Name of stream
     * @param mimeType       MIME type of data
     * @param expectedStatus Expected HTTP response code (otherwise, we'll fail)
     * @param data           Content to write to stream
     */
    async putDatastream(
        pid: string,
        stream: string,
        mimeType: string,
        expectedStatus = [201],
        data: string | Buffer,
        linkHeader = "",
    ): Promise<void> {
        this.cache.purgeFromCacheIfEnabled(pid);
        const md5 = crypto.createHash("md5").update(data).digest("hex");
        const sha = crypto.createHash("sha512").update(data).digest("hex");
        const headers: Record<string, string> = {
            "Content-Disposition": 'attachment; filename="' + stream + '"',
            "Content-Type": mimeType,
            Digest: "md5=" + md5 + ", sha-512=" + sha,
        };
        const options = { headers: headers };
        if (linkHeader.length > 0) {
            options.headers.Link = linkHeader;
        }
        const targetPath = "/" + pid + "/" + stream;
        const callback = async () => {
            const response = await this._request("put", targetPath, data, options);
            if (!expectedStatus.includes(response.statusCode)) {
                throw new HttpError(
                    response,
                    `Expected ${expectedStatus} Created response, received: ${response.statusCode}`,
                );
            }
        };
        await this.callWith409Retry(callback);
    }

    /**
     * Add a datastream to Fedora.
     *
     * @param pid            Object containing datastream
     * @param stream         Name of stream
     * @param params         Additional parameters
     * @param data           Content to write to stream
     * @param expectedStatus Array of expected legal HTTP response codes
     */
    async addDatastream(
        pid: string,
        stream: string,
        params: DatastreamParameters,
        data: string | Buffer,
        expectedStatus = [201],
    ): Promise<void> {
        this.cache.purgeFromCacheIfEnabled(pid);

        // First create the stream:
        await this.putDatastream(pid, stream, params.mimeType, expectedStatus, data, params.linkHeader ?? "");

        // Now set appropriate metadata:
        const writer = new N3.Writer({ format: "text/turtle" });
        writer.addQuad(
            namedNode(""),
            namedNode("http://fedora.info/definitions/1/0/access/objState"),
            literal(params.dsState ?? "A"),
        );
        writer.addQuad(
            namedNode(""),
            namedNode("http://purl.org/dc/terms/title"),
            literal(params.dsLabel ?? pid.replace(/:/g, "_") + "_" + stream),
        );
        const turtle = this.getOutputFromWriter(writer);
        const targetPath = "/" + pid + "/" + stream + "/fcr:metadata";
        const patchResponse = await this.patchRdf(targetPath, turtle);
        if (patchResponse.statusCode !== 204) {
            throw new Error("Expected 204 No Content response, received: " + patchResponse.statusCode);
        }
    }

    /**
     * Change the label of a container
     *
     * @param pid   PID of object to modify
     * @param title New label to apply
     */
    async modifyObjectLabel(pid: string, title: string): Promise<void> {
        this.cache.purgeFromCacheIfEnabled(pid);
        const writer = new N3.Writer({ format: "text/turtle" });
        this.addLabelToContainerGraph(writer, title);
        const insertClause = this.getOutputFromWriter(writer);
        const deleteClause =
            "<> <http://purl.org/dc/terms/title> ?any ; <info:fedora/fedora-system:def/model#label> ?any .";
        const whereClause = "?id <http://purl.org/dc/terms/title> ?any";
        const response = await this.patchRdf("/" + pid, insertClause, deleteClause, whereClause);
        if (response.statusCode !== 204) {
            throw new Error("Expected 204 No Content response, received: " + response.statusCode);
        }
    }

    /**
     * Change the state of an object
     *
     * @param pid   PID of object to modify
     * @param state New state to set
     */
    async modifyObjectState(pid: string, state: string): Promise<void> {
        this.cache.purgeFromCacheIfEnabled(pid);
        const writer = new N3.Writer({ format: "text/turtle" });
        writer.addQuad(namedNode(""), namedNode("info:fedora/fedora-system:def/model#state"), literal(state));
        const insertClause = this.getOutputFromWriter(writer);
        const deleteClause = "<> <info:fedora/fedora-system:def/model#state> ?any .";
        const whereClause = "?id <info:fedora/fedora-system:def/model#state> ?any";
        const response = await this.patchRdf("/" + pid, insertClause, deleteClause, whereClause);
        if (response.statusCode !== 204) {
            throw new Error("Expected 204 No Content response, received: " + response.statusCode);
        }
    }

    /**
     * Add a triple to the Fedora object.
     *
     * @param pid        PID to update
     * @param subject    RDF subject
     * @param predicate  RDF predicate
     * @param obj        RDF object
     * @param isLiteral  Is object a literal (true) or a URI (false)?
     */
    async addRelationship(
        pid: string,
        subject: string,
        predicate: string,
        obj: string,
        isLiteral = false,
    ): Promise<void> {
        this.cache.purgeFromCacheIfEnabled(pid);
        const writer = new N3.Writer({ format: "text/turtle" });
        writer.addQuad(namedNode(subject), namedNode(predicate), isLiteral ? literal(obj) : namedNode(obj));
        const turtle = this.getOutputFromWriter(writer);
        const targetPath = "/" + pid;
        const patchResponse = await this.patchRdf(targetPath, turtle);
        if (patchResponse.statusCode !== 204) {
            throw new Error("Expected 204 No Content response, received: " + patchResponse.statusCode);
        }
    }

    /**
     * This method removes an isMemberOf relationship from a pid/parent pid pair.
     *
     * @param pid       PID to update
     * @param parentPid Parent PID to update
     */
    async deleteParentRelationship(pid: string, parentPid: string): Promise<void> {
        this.cache.purgeFromCacheIfEnabled(pid);
        const predicate = "info:fedora/fedora-system:def/relations-external#isMemberOf";
        const targetPath = "/" + pid;
        const insertClause = "";
        const deleteClause = `<> <${predicate}> <info:fedora/${parentPid}> .`;
        const whereClause = "";
        const patchResponse = await this.patchRdf(targetPath, insertClause, deleteClause, whereClause);
        if (patchResponse.statusCode !== 204) {
            throw new Error("Expected 204 No Content response, received: " + patchResponse.statusCode);
        }
    }

    /**
     * This method removes a sequence relationship from a pid/parent pid pair.
     *
     * @param pid       PID to update
     * @param parentPid Parent PID to update
     */
    async deleteSequenceRelationship(pid: string, parentPid: string): Promise<void> {
        this.cache.purgeFromCacheIfEnabled(pid);
        const predicate = "http://vudl.org/relationships#sequence";
        const targetPath = "/" + pid;
        const insertClause = "";
        const deleteClause = `<> <${predicate}> ?pos .`;
        const whereClause = `?id <${predicate}> ?pos . FILTER(REGEX(?pos, "${parentPid}#"))`;
        const patchResponse = await this.patchRdf(targetPath, insertClause, deleteClause, whereClause);
        if (patchResponse.statusCode !== 204) {
            throw new Error("Expected 204 No Content response, received: " + patchResponse.statusCode);
        }
    }

    /**
     * This method changes the "sort on" property of a collection.
     *
     * @param pid    PID to update
     * @param sortOn New sort value
     */
    async updateSortOnRelationship(pid: string, sortOn: string): Promise<void> {
        if (sortOn !== "title" && sortOn !== "custom") {
            throw new Error("Unexpected sortOn value: " + sortOn);
        }
        this.cache.purgeFromCacheIfEnabled(pid);
        const subject = "info:fedora/" + pid;
        const predicate = "http://vudl.org/relationships#sortOn";
        const writer = new N3.Writer({ format: "text/turtle" });
        writer.addQuad(namedNode(subject), namedNode(predicate), literal(sortOn));
        const insertClause = this.getOutputFromWriter(writer);
        const targetPath = "/" + pid;
        const deleteClause = `<> <${predicate}> ?any .`;
        const whereClause = `?id <${predicate}> ?any`;
        const patchResponse = await this.patchRdf(targetPath, insertClause, deleteClause, whereClause);
        if (patchResponse.statusCode !== 204) {
            throw new Error("Expected 204 No Content response, received: " + patchResponse.statusCode);
        }
    }

    /**
     * This method changes the sequential position of a pid within a specified parent pid.
     * It is the responsibility of the caller to ensure that parentPid is a legal parent of pid.
     *
     * @param pid         PID to update
     * @param parentPid   Parent PID to update
     * @param newPosition New position to set
     */
    async updateSequenceRelationship(pid: string, parentPid: string, newPosition: number): Promise<void> {
        this.cache.purgeFromCacheIfEnabled(pid);
        const subject = "info:fedora/" + pid;
        const predicate = "http://vudl.org/relationships#sequence";
        const writer = new N3.Writer({ format: "text/turtle" });
        writer.addQuad(namedNode(subject), namedNode(predicate), literal(`${parentPid}#${newPosition}`));
        const insertClause = this.getOutputFromWriter(writer);
        const targetPath = "/" + pid;
        const deleteClause = `<> <${predicate}> ?pos .`;
        const whereClause = `OPTIONAL { ?id <${predicate}> ?pos . FILTER(REGEX(?pos, "${parentPid}#")) }`;
        const patchResponse = await this.patchRdf(targetPath, insertClause, deleteClause, whereClause);
        if (patchResponse.statusCode !== 204) {
            throw new Error("Expected 204 No Content response, received: " + patchResponse.statusCode);
        }
    }

    /**
     * Patch the RDF of a resource in Fedora.
     *
     * @param targetPath   Fedora path to patch
     * @param insertClause RDF to insert
     * @param deleteClause RDF delete conditions (optional)
     * @param whereClause  RDF where clause (optional)
     */
    async patchRdf(
        targetPath: string,
        insertClause: string,
        deleteClause = "",
        whereClause = "",
    ): Promise<NeedleResponse> {
        const options = {
            headers: {
                "Content-Type": "application/sparql-update",
            },
        };
        const update =
            (deleteClause.length === 0 ? "" : "DELETE { " + deleteClause + " }") +
            (insertClause.length === 0 ? "" : " INSERT { " + insertClause + " }") +
            " WHERE { " +
            whereClause +
            " }";
        return this._request("patch", targetPath, update, options);
    }

    /**
     * Get the output from an N3.Writer object.
     *
     * @param writer N3.Writer that has already been populated with RDF.
     */
    getOutputFromWriter(writer: N3.Writer): string {
        let data = "";
        writer.end((error, result) => {
            if (error) {
                throw new Error("Problem writing output.");
            }
            data = result;
        });
        if (data.length === 0) {
            throw new Error("RDF graph generation failed!");
        }
        return data;
    }

    /**
     * Add appropriate label/title properties to an RDF graph representing a container.
     *
     * @param writer N3 RDF writer
     * @param label  Title to add to graph
     */
    addLabelToContainerGraph(writer: N3.Writer, label: string): void {
        writer.addQuad(namedNode(""), namedNode("http://purl.org/dc/terms/title"), literal(label));
        writer.addQuad(namedNode(""), namedNode("info:fedora/fedora-system:def/model#label"), literal(label));
    }

    /**
     * Create a container in the repository
     *
     * @param pid Record id
     * @param label Label
     * @param state Object state (A = Active, I = Inactive)
     * @param owner Object owner
     */
    async createContainer(pid: string, label: string, state: string, owner = "diglibEditor"): Promise<void> {
        const writer = new N3.Writer({ format: "text/turtle" });
        this.addLabelToContainerGraph(writer, label);
        writer.addQuad(namedNode(""), namedNode("info:fedora/fedora-system:def/model#state"), literal(state));
        writer.addQuad(namedNode(""), namedNode("info:fedora/fedora-system:def/model#ownerId"), literal(owner));
        const options = {
            headers: {
                "Content-Type": "text/turtle",
            },
        };
        const response = await this._request("put", "/" + pid, this.getOutputFromWriter(writer), options);
        if (response.statusCode !== 201) {
            throw new Error("Expected 201 Created response, received: " + response.statusCode);
        }
        // Now create DC datastream:
        const xml =
            '<oai_dc:dc xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">' +
            "\n" +
            "  <dc:identifier>" +
            xmlescape(pid) +
            "</dc:identifier>\n" +
            "  <dc:title>" +
            xmlescape(label) +
            "</dc:title>\n" +
            "</oai_dc:dc>\n";
        const params: DatastreamParameters = {
            mimeType: "text/xml",
            logMessage: "Create initial Dublin Core record",
        };
        await this.addDatastream(pid, "DC", params, xml, [201]);
    }

    /**
     * Send a message to the active logger (if any).
     *
     * @param message Message to log
     */
    log(message: string): void {
        if (this.logger && message.length > 0) {
            this.logger.info(message);
        }
    }

    /**
     * Set the active logger
     *
     * @param logger Logger object to use (or null to disable logging)
     */
    setLogger(logger: winston.Logger | null): void {
        this.logger = logger;
    }
}

export default Fedora;
