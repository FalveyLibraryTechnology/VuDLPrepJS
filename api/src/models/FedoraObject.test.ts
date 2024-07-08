import { FedoraObject } from "./FedoraObject";
import { Fedora } from "../services/Fedora";
import FedoraDataCollector from "../services/FedoraDataCollector";
import FedoraDataCollection from "./FedoraDataCollection";
import * as fs from "fs";
import Config from "../models/Config";
import SolrCache from "../services/SolrCache";

jest.mock("fs");

describe("FedoraObject", () => {
    let fedoraObject: FedoraObject;
    let pid: string;
    let buffer: Buffer;
    let filename: string;
    let stream: string;
    let mimeType: string;
    beforeEach(() => {
        buffer = Buffer.alloc(1024);
        pid = "testPid";
        filename = "test1";
        stream = "test2";
        mimeType = "test3";
        jest.spyOn(fs, "readFileSync").mockReturnValue(buffer);
        Config.setInstance(new Config({}));
        fedoraObject = FedoraObject.build(pid);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("addMasterMetadataDatastream", () => {
        it("calls FITS and saves the results to a datastream", async () => {
            const fakeFilename = "/tmp/foo";
            const fakeXml = "<foo />";
            const fitsSpy = jest.spyOn(fedoraObject, "fitsMasterMetadata").mockReturnValue(fakeXml);
            const saveSpy = jest.spyOn(fedoraObject, "addDatastream").mockResolvedValue();
            await fedoraObject.addMasterMetadataDatastream(fakeFilename);
            expect(fitsSpy).toHaveBeenCalledWith(fakeFilename);
            const expectedParams = {
                mimeType: "text/xml",
                logMessage: "Initial Ingest addDatastream - MASTER-MD",
            };
            expect(saveSpy).toHaveBeenCalledWith("MASTER-MD", expectedParams, fakeXml, [201, 204]);
        });
    });

    describe("modifyLicense", () => {
        it("adds a datastream for a license", async () => {
            const config = new Config({
                licenses: {
                    licenseKey1: {
                        uri: "license1Url",
                    },
                },
            });
            const fedora = new Fedora(config, new SolrCache(false));
            fedoraObject = new FedoraObject(pid, config, fedora, FedoraDataCollector.getInstance());
            const spy = jest.spyOn(fedoraObject, "addDatastreamFromStringOrBuffer").mockImplementation(jest.fn());

            await fedoraObject.modifyLicense(stream, "licenseKey1");

            expect(spy).toHaveBeenCalledWith(expect.stringContaining("license1Url"), stream, "text/xml", [201, 204]);
        });
    });

    describe("modifyAgents", () => {
        let agents;
        let dates;
        beforeEach(() => {
            dates = {
                createDate: "test",
                modifiedDate: "test",
            };
            agents = [
                {
                    role: "test1",
                    type: "test2",
                    name: "test3",
                    notes: ["test4"],
                },
            ];
        });
        test.each([
            ["zero", [], ""],
            ["one", ["test4"], "<METS:note>test4</METS:note>"],
            [
                "multiple",
                ["test4", "test5", "test6"],
                "<METS:note>test4</METS:note><METS:note>test5</METS:note><METS:note>test6</METS:note>",
            ],
            ["doubleQuotes", [`""`], "<METS:note>&quot;&quot;</METS:note>"],
        ])("adds a datastream for an agent with %s notes", async (numString, testInput, notesXml) => {
            const config = new Config({});
            const fedora = new Fedora(config, new SolrCache(false));
            fedoraObject = new FedoraObject(pid, config, fedora, FedoraDataCollector.getInstance());
            const spy = jest.spyOn(fedoraObject, "addDatastreamFromStringOrBuffer").mockImplementation(jest.fn());
            agents[0].notes = testInput;
            const expectedXml =
                `<METS:agent ROLE="test1" TYPE="test2">` + `<METS:name>test3</METS:name>${notesXml}</METS:agent>`;
            await fedoraObject.modifyAgents(stream, agents, dates);

            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining(expectedXml.trim()),
                stream,
                "text/xml",
                [201, 204],
            );
        });
    });

    describe("addRelationship", () => {
        it("proxies a call to the fedora service", () => {
            const fedora = Fedora.getInstance();
            const spy = jest.spyOn(fedora, "addRelationship").mockImplementation(jest.fn());
            fedoraObject = FedoraObject.build(pid);
            fedoraObject.addRelationship("subject", "predicate", "object", true);
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith(pid, "subject", "predicate", "object", true);
        });
    });

    describe("addParentRelationship", () => {
        it("proxies a call to the fedora service", () => {
            const fedora = Fedora.getInstance();
            const spy = jest.spyOn(fedora, "addRelationship").mockImplementation(jest.fn());
            fedoraObject = FedoraObject.build(pid);
            fedoraObject.addParentRelationship("foo:999");
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith(
                pid,
                "info:fedora/" + pid,
                "info:fedora/fedora-system:def/relations-external#isMemberOf",
                "info:fedora/foo:999",
                false,
            );
        });
    });

    describe("getSortOn", () => {
        it("defaults to title", async () => {
            const fedora = Fedora.getInstance();
            jest.spyOn(fedora, "getDublinCore").mockResolvedValue(null);
            jest.spyOn(fedora, "getRdf").mockResolvedValue("<rdf />");
            fedoraObject = FedoraObject.build(pid);
            expect(await fedoraObject.getSortOn()).toEqual("title");
        });

        it("uses the data collector to obtain sort data", async () => {
            const collector = FedoraDataCollector.getInstance();
            const collection = FedoraDataCollection.build(pid, {}, { sortOn: ["custom"] });
            const collectorSpy = jest.spyOn(collector, "getObjectData").mockResolvedValue(collection);
            fedoraObject = FedoraObject.build(pid);
            expect(await fedoraObject.getSortOn()).toEqual("custom");
            expect(collectorSpy).toHaveBeenCalledTimes(1);
            expect(collectorSpy).toHaveBeenCalledWith(pid);
        });
    });

    describe("updateDatastreamFromFile", () => {
        let addDatastreamFromStringOrBufferSpy;
        it("updates datastream and tracks status 201 and 204", async () => {
            addDatastreamFromStringOrBufferSpy = jest.spyOn(fedoraObject, "addDatastreamFromStringOrBuffer");
            addDatastreamFromStringOrBufferSpy.mockResolvedValue({});

            await fedoraObject.updateDatastreamFromFile(filename, stream, mimeType);

            expect(fs.readFileSync).toHaveBeenCalledWith(filename);
            expect(addDatastreamFromStringOrBufferSpy).toHaveBeenCalledWith(buffer, stream, mimeType, [201, 204]);
        });
    });

    describe("getDatastreamMetadata", () => {
        let getRdfSpy;
        it("gets the datastream metadata", async () => {
            getRdfSpy = jest.spyOn(Fedora.getInstance(), "getRdf").mockResolvedValue("test");

            const metadata = await fedoraObject.getDatastreamMetadata(stream);

            expect(metadata).toEqual("test");
            expect(getRdfSpy).toHaveBeenCalledWith(`${pid}/${stream}/fcr:metadata`);
        });
    });

    describe("deleteDatastream", () => {
        let deleteDatastreamSpy;
        let deleteDatastreamTombstoneSpy;
        it("deletes datastream and tombstone", async () => {
            deleteDatastreamSpy = jest.spyOn(Fedora.getInstance(), "deleteDatastream").mockImplementation(jest.fn());
            deleteDatastreamTombstoneSpy = jest
                .spyOn(Fedora.getInstance(), "deleteDatastreamTombstone")
                .mockImplementation(jest.fn());

            await fedoraObject.deleteDatastream(stream);

            expect(deleteDatastreamSpy).toHaveBeenCalledWith(pid, stream);
            expect(deleteDatastreamTombstoneSpy).toHaveBeenCalledWith(pid, stream);
        });
    });

    describe("deleteDatastreamTombstone", () => {
        let deleteDatastreamTombstoneSpy;
        it("deletes tombstone", async () => {
            deleteDatastreamTombstoneSpy = jest
                .spyOn(Fedora.getInstance(), "deleteDatastreamTombstone")
                .mockImplementation(jest.fn());

            await fedoraObject.deleteDatastreamTombstone(stream);

            expect(deleteDatastreamTombstoneSpy).toHaveBeenCalledWith(pid, stream);
        });
    });

    describe("putDatastream", () => {
        let putDatastreamSpy;
        beforeEach(() => {
            putDatastreamSpy = jest.spyOn(Fedora.getInstance(), "putDatastream").mockImplementation(jest.fn());
        });

        it("proxies the Fedora service", async () => {
            const params = { mimeType: "foo/bar" };
            const expectedStatus = [204];
            await fedoraObject.putDatastream("foo", params, "data", expectedStatus);
            expect(putDatastreamSpy).toHaveBeenCalledWith(pid, "foo", "foo/bar", expectedStatus, "data");
        });

        it("logs messages", async () => {
            const logSpy = jest.spyOn(fedoraObject, "log").mockImplementation(jest.fn());
            const params = { mimeType: "foo/bar", logMessage: "log" };
            const expectedStatus = [204];
            await fedoraObject.putDatastream("foo", params, "data", expectedStatus);
            expect(logSpy).toHaveBeenCalledWith("log");
        });

        it("does not support dsLabel or dsState parameters", async () => {
            const params = { dsLabel: "foo", dsState: "bar" };
            await expect(async () => {
                await fedoraObject.putDatastream("foo", params, "bar", [200]);
            }).rejects.toThrow("Unsupported parameter(s) passed to putDatastream()");
        });
    });

    describe("createOrModifyDatastream", () => {
        it("proxies putDatastream with appropriate status expectations", async () => {
            const putSpy = jest.spyOn(fedoraObject, "putDatastream").mockImplementation(jest.fn());
            await fedoraObject.createOrModifyDatastream("foo", { mimeType: "bar" }, "baz");
            expect(putSpy).toHaveBeenCalledWith("foo", { mimeType: "bar" }, "baz", [201, 204]);
        });
    });

    describe("modifyDatastream", () => {
        it("proxies putDatastream with appropriate status expectations", async () => {
            const putSpy = jest.spyOn(fedoraObject, "putDatastream").mockImplementation(jest.fn());
            await fedoraObject.modifyDatastream("foo", { mimeType: "bar" }, "baz");
            expect(putSpy).toHaveBeenCalledWith("foo", { mimeType: "bar" }, "baz", [204]);
        });
    });
});
