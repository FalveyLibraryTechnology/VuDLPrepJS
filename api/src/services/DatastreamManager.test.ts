import FedoraCatalog from "./FedoraCatalog";
import { FedoraObject } from "../models/FedoraObject";
import MetadataExtractor from "./MetadataExtractor";
import DatastreamManager from "./DatastreamManager";
import Config from "../models/Config";

describe("DatastreamManager", () => {
    let config;
    let fedoraObjectBuildSpy;
    let createOrModifyDatastreamSpy;
    let modifyDatastreamSpy;
    let modifyLicenseSpy;
    let modifyObjectLabelSpy;
    let modifyAgentsSpy;
    let getDatastreamSpy;
    let updateDatastreamFromFileSpy;
    let datastreamManager;
    let datastreamsSpy;
    beforeEach(() => {
        config = {
            licenses: {
                testLicenseKey: {
                    name: "testLicense",
                    uri: "testLicense.com",
                },
            },
        };
        jest.spyOn(Config, "getInstance").mockReturnValue(config);
        fedoraObjectBuildSpy = jest.spyOn(FedoraObject, "build");
        getDatastreamSpy = jest.spyOn(FedoraObject.prototype, "getDatastream").mockImplementation(jest.fn());
        modifyAgentsSpy = jest.spyOn(FedoraObject.prototype, "modifyAgents").mockImplementation(jest.fn());
        createOrModifyDatastreamSpy = jest
            .spyOn(FedoraObject.prototype, "createOrModifyDatastream")
            .mockImplementation(jest.fn());
        modifyDatastreamSpy = jest.spyOn(FedoraObject.prototype, "modifyDatastream").mockImplementation(jest.fn());
        modifyLicenseSpy = jest.spyOn(FedoraObject.prototype, "modifyLicense").mockImplementation(jest.fn());
        modifyObjectLabelSpy = jest.spyOn(FedoraObject.prototype, "modifyObjectLabel").mockImplementation(jest.fn());
        updateDatastreamFromFileSpy = jest
            .spyOn(FedoraObject.prototype, "updateDatastreamFromFile")
            .mockImplementation(jest.fn());
        datastreamsSpy = jest.spyOn(FedoraCatalog.prototype, "getDatastreamMimetypes").mockImplementation(jest.fn());
        datastreamManager = DatastreamManager.getInstance();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("hasValidMimeType", () => {
        beforeEach(() => {
            datastreamsSpy.mockReturnValue({
                WAV: {
                    mimetype: {
                        allowedType: "test1",
                        allowedSubtypes: "test2,test3,test4",
                    },
                },
                THUMBNAIL: {
                    mimetype: {
                        allowedType: "*",
                        allowedSubtypes: "test2,test3,test4",
                    },
                },
                MEDIUM: {
                    mimetype: {
                        allowedType: "test1",
                        allowedSubtypes: "*",
                    },
                },
                NOTYPES: {
                    mimetype: {},
                },
                NOMIMETYPE: {},
            });
        });

        it("returns false when subtype does not exist", () => {
            expect(datastreamManager.hasValidMimeType("WAV", "test1/test5")).toBeFalsy();
        });

        it("returns false when type does not exist", () => {
            expect(datastreamManager.hasValidMimeType("WAV", "test5/test2")).toBeFalsy();
        });

        it("returns false when mimetype does not follow pattern", () => {
            expect(datastreamManager.hasValidMimeType("WAV", "test1/test2/test3")).toBeFalsy();
        });

        it("returns false when allowedType/allowedSubtypes does not exist", () => {
            expect(datastreamManager.hasValidMimeType("NOTYPES", "test1/test2")).toBeFalsy();
        });

        it("returns false when mimetype does not exist", () => {
            expect(datastreamManager.hasValidMimeType("NOMIMETYPE", "test1/test2")).toBeFalsy();
        });

        it("returns true when type/subtype does exist", () => {
            expect(datastreamManager.hasValidMimeType("WAV", "test1/test2")).toBeTruthy();
        });

        it("returns true for any type", () => {
            expect(datastreamManager.hasValidMimeType("THUMBNAIL", "anythingreally/test2")).toBeTruthy();
        });

        it("returns true for any subtype", () => {
            expect(datastreamManager.hasValidMimeType("MEDIUM", "test1/anythingworks")).toBeTruthy();
        });
    });

    describe("getMetadata", () => {
        let getDatastreamMetadataSpy;
        let pid;
        let stream;
        let xml;

        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            xml = "test3";
            getDatastreamMetadataSpy = jest.spyOn(FedoraObject.prototype, "getDatastreamMetadata");
        });

        it("gets the datastream metadata", async () => {
            getDatastreamMetadataSpy.mockResolvedValue(xml);
            const metadata = await datastreamManager.getMetadata(pid, stream);

            expect(fedoraObjectBuildSpy).toHaveBeenCalledWith(pid);
            expect(metadata).toEqual(xml);
            expect(getDatastreamMetadataSpy).toHaveBeenCalledWith(stream);
        });
    });

    describe("getMimeType", () => {
        let getMetadataSpy;
        let extractEbuNodeSpy;
        let pid;
        let stream;
        let xml;
        let mimeType;

        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            xml = "test3";
            mimeType = "test4";
            getMetadataSpy = jest.spyOn(datastreamManager, "getMetadata");
            extractEbuNodeSpy = jest.spyOn(MetadataExtractor.prototype, "extractEbuCore");
        });

        it("gets the datastream metadata", async () => {
            getMetadataSpy.mockResolvedValue(xml);
            extractEbuNodeSpy.mockReturnValue({
                hasMimeType: [mimeType],
            });

            expect(await datastreamManager.getMimeType(pid, stream)).toEqual(mimeType);

            expect(getMetadataSpy).toHaveBeenCalledWith(pid, stream);
            expect(extractEbuNodeSpy).toHaveBeenCalledWith(xml, "//ebucore:hasMimeType");
        });
    });

    describe("downloadBuffer", () => {
        let getDatastreamAsBufferSpy;
        let pid;
        let stream;
        let buffer;

        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            buffer = "test3";
            getDatastreamAsBufferSpy = jest.spyOn(FedoraObject.prototype, "getDatastreamAsBuffer");
        });

        it("gets the datastream as a buffer", async () => {
            getDatastreamAsBufferSpy.mockResolvedValue(buffer);
            const response = await datastreamManager.downloadBuffer(pid, stream);

            expect(fedoraObjectBuildSpy).toHaveBeenCalledWith(pid);
            expect(response).toEqual(buffer);
            expect(getDatastreamAsBufferSpy).toHaveBeenCalledWith(stream);
        });
    });

    describe("uploadFile", () => {
        let hasValidMimeTypeSpy;
        let pid;
        let stream;
        let filepath;
        let mimeType;
        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            filepath = "test3";
            mimeType = "test4";
            hasValidMimeTypeSpy = jest.spyOn(datastreamManager, "hasValidMimeType");
        });

        it("calls updateDataStreamFromFile when mime type is valid", async () => {
            updateDatastreamFromFileSpy.mockResolvedValue(false);
            hasValidMimeTypeSpy.mockReturnValue(true);

            await datastreamManager.uploadFile(pid, stream, filepath, mimeType);

            expect(fedoraObjectBuildSpy).toHaveBeenCalledWith(pid);
            expect(hasValidMimeTypeSpy).toHaveBeenCalledWith(stream, mimeType);
            expect(updateDatastreamFromFileSpy).toHaveBeenCalledWith(filepath, stream, mimeType);
        });

        it("throws an error when mime type is invalid", async () => {
            hasValidMimeTypeSpy.mockReturnValue(false);
            expect(datastreamManager.uploadFile(pid, stream, filepath, mimeType)).rejects.toThrowError(
                "Invalid mime type: " + mimeType,
            );
        });
    });

    describe("uploadDublinCoreMetadata", () => {
        let pid;
        let stream;
        let metadata;
        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            metadata = { "dc:title": ['the "best" title'], "dc:subject": ["one", "two"] };
        });
        it("performs appropriate updates (when there is no ID in data)", async () => {
            modifyDatastreamSpy.mockResolvedValue("");
            modifyObjectLabelSpy.mockResolvedValue("");

            await datastreamManager.uploadDublinCoreMetadata(pid, stream, metadata);

            expect(modifyObjectLabelSpy).toHaveBeenCalledWith('the "best" title');
            const expectedXml =
                '<oai_dc:dc xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">\n' +
                "  <dc:title>the &quot;best&quot; title</dc:title>\n" +
                "  <dc:subject>one</dc:subject>\n" +
                "  <dc:subject>two</dc:subject>\n" +
                "  <dc:identifier>test1</dc:identifier>\n" +
                "</oai_dc:dc>\n";
            expect(modifyDatastreamSpy).toHaveBeenCalledWith(stream, { mimeType: "text/xml" }, expectedXml);
        });

        it("performs appropriate updates (when there is a mismatched ID in data)", async () => {
            modifyDatastreamSpy.mockResolvedValue("");
            modifyObjectLabelSpy.mockResolvedValue("");
            metadata["dc:identifier"] = ["nope"];

            await datastreamManager.uploadDublinCoreMetadata(pid, stream, metadata);

            expect(modifyObjectLabelSpy).toHaveBeenCalledWith('the "best" title');
            const expectedXml =
                '<oai_dc:dc xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">\n' +
                "  <dc:title>the &quot;best&quot; title</dc:title>\n" +
                "  <dc:subject>one</dc:subject>\n" +
                "  <dc:subject>two</dc:subject>\n" +
                "  <dc:identifier>nope</dc:identifier>\n" +
                "  <dc:identifier>test1</dc:identifier>\n" +
                "</oai_dc:dc>\n";
            expect(modifyDatastreamSpy).toHaveBeenCalledWith(stream, { mimeType: "text/xml" }, expectedXml);
        });
    });

    describe("uploadProcessMetadata", () => {
        let pid;
        let stream;
        let metadata;
        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            metadata = {
                processCreator: "first",
                processDateTime: "2022-10-05T07:00:00",
                processLabel: "Digitize Original Item",
                processOrganization: "Falvey Memorial Library, Villanova University",
                tasks: [
                    {
                        description: "task desc 1",
                        id: "1",
                        individual: "task indiv 1",
                        label: "task label 1",
                        sequence: "1",
                        toolDescription: "desc 1",
                        toolLabel: "Photoshop",
                        toolMake: "Adobe",
                        toolSerialNumber: "sn1",
                        toolVersion: "CS2",
                    },
                    {
                        description: "task desc 2",
                        id: "2",
                        individual: "task indiv 2",
                        label: "task label 2",
                        sequence: "1",
                        toolDescription: "desc 2",
                        toolLabel: "Indus 5005 MAX LARGE FORMAT BOOK SCANNER",
                        toolMake: "ImageWare",
                        toolSerialNumber: "LF-00207",
                        toolVersion: "LF-00207",
                    },
                ],
            };
        });

        it("performs appropriate updates", async () => {
            createOrModifyDatastreamSpy.mockResolvedValue("");

            await datastreamManager.uploadProcessMetadata(pid, stream, metadata);

            const expectedXml = `<?xml version="1.0" encoding="UTF-8"?>
<DIGIPROVMD:DIGIPROVMD xmlns:DIGIPROVMD="http://www.loc.gov/PMD">
    <DIGIPROVMD:task ID="1">
        <DIGIPROVMD:task_label>task label 1</DIGIPROVMD:task_label>
        <DIGIPROVMD:task_description>task desc 1</DIGIPROVMD:task_description>
        <DIGIPROVMD:task_sequence>1</DIGIPROVMD:task_sequence>
        <DIGIPROVMD:task_individual>task indiv 1</DIGIPROVMD:task_individual>
        <DIGIPROVMD:tool>
        <DIGIPROVMD:tool_label>Photoshop</DIGIPROVMD:tool_label>
        <DIGIPROVMD:tool_description>desc 1</DIGIPROVMD:tool_description>
        <DIGIPROVMD:tool_make>Adobe</DIGIPROVMD:tool_make>
        <DIGIPROVMD:tool_version>CS2</DIGIPROVMD:tool_version>
        <DIGIPROVMD:tool_serial_number>sn1</DIGIPROVMD:tool_serial_number>
        </DIGIPROVMD:tool>
    </DIGIPROVMD:task>
    <DIGIPROVMD:task ID="2">
        <DIGIPROVMD:task_label>task label 2</DIGIPROVMD:task_label>
        <DIGIPROVMD:task_description>task desc 2</DIGIPROVMD:task_description>
        <DIGIPROVMD:task_sequence>1</DIGIPROVMD:task_sequence>
        <DIGIPROVMD:task_individual>task indiv 2</DIGIPROVMD:task_individual>
        <DIGIPROVMD:tool>
        <DIGIPROVMD:tool_label>Indus 5005 MAX LARGE FORMAT BOOK SCANNER</DIGIPROVMD:tool_label>
        <DIGIPROVMD:tool_description>desc 2</DIGIPROVMD:tool_description>
        <DIGIPROVMD:tool_make>ImageWare</DIGIPROVMD:tool_make>
        <DIGIPROVMD:tool_version>LF-00207</DIGIPROVMD:tool_version>
        <DIGIPROVMD:tool_serial_number>LF-00207</DIGIPROVMD:tool_serial_number>
        </DIGIPROVMD:tool>
    </DIGIPROVMD:task>
    <DIGIPROVMD:process_creator>first</DIGIPROVMD:process_creator>
    <DIGIPROVMD:process_datetime>2022-10-05T07:00:00</DIGIPROVMD:process_datetime>
    <DIGIPROVMD:process_label>Digitize Original Item</DIGIPROVMD:process_label>
    <DIGIPROVMD:process_organization>Falvey Memorial Library, Villanova University</DIGIPROVMD:process_organization>
</DIGIPROVMD:DIGIPROVMD>`;
            expect(createOrModifyDatastreamSpy).toHaveBeenCalledWith(stream, { mimeType: "text/xml" }, expectedXml);
        });
    });

    describe("uploadLicense", () => {
        let pid;
        let stream;
        let licenseKey;
        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            licenseKey = "testLicenseKey";
        });

        it("calls uploadLicense with success", async () => {
            modifyLicenseSpy.mockResolvedValue("");

            await datastreamManager.uploadLicense(pid, stream, licenseKey);

            expect(fedoraObjectBuildSpy).toHaveBeenCalledWith(pid);
            expect(modifyLicenseSpy).toHaveBeenCalledWith(stream, licenseKey);
        });
    });

    describe("uploadAgents", () => {
        let pid;
        let stream;
        let agents;
        let agentsAttributes;
        let extractAgentsAttributesSpy;
        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            agents = ["test3"];
            agentsAttributes = { createDate: "test4", modifyDate: "test5", recordStatus: "test6" };
            extractAgentsAttributesSpy = jest.spyOn(MetadataExtractor.prototype, "extractAgentsAttributes");
        });

        it("calls uploadAgents with success", async () => {
            getDatastreamSpy.mockReturnValue("testXml");
            extractAgentsAttributesSpy.mockReturnValue(agentsAttributes);
            modifyAgentsSpy.mockResolvedValue("");

            await datastreamManager.uploadAgents(pid, stream, agents);

            expect(getDatastreamSpy).toHaveBeenCalledWith(stream, true);
            expect(extractAgentsAttributesSpy).toHaveBeenCalledWith("testXml");
            expect(modifyAgentsSpy).toHaveBeenCalledWith(stream, agents, agentsAttributes);
        });
    });

    describe("getLicenseKey", () => {
        let pid;
        let stream;
        let extractLicenseSpy;
        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            extractLicenseSpy = jest.spyOn(MetadataExtractor.prototype, "extractLicense");
        });

        it("returns a licenseKey", async () => {
            getDatastreamSpy.mockReturnValue("testXml");
            extractLicenseSpy.mockReturnValue("testLicense.com");

            const response = await datastreamManager.getLicenseKey(pid, stream);

            expect(fedoraObjectBuildSpy).toHaveBeenCalledWith(pid);
            expect(getDatastreamSpy).toHaveBeenCalledWith(stream);
            expect(extractLicenseSpy).toHaveBeenCalledWith("testXml");
            expect(response).toEqual("testLicenseKey");
        });

        it("returns an empty string when an unrecognized URI is provided", async () => {
            getDatastreamSpy.mockReturnValue("testXml");
            extractLicenseSpy.mockReturnValue("notALicense");

            const response = await datastreamManager.getLicenseKey(pid, stream);

            expect(fedoraObjectBuildSpy).toHaveBeenCalledWith(pid);
            expect(getDatastreamSpy).toHaveBeenCalledWith(stream);
            expect(extractLicenseSpy).toHaveBeenCalledWith("testXml");
            expect(response).toEqual("");
        });
    });

    describe("getAgents", () => {
        let pid;
        let stream;
        let getAgentsSpy;
        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            getAgentsSpy = jest.spyOn(MetadataExtractor.prototype, "getAgents");
        });

        it("returns agents", async () => {
            const agents = [
                {
                    role: "test3",
                    type: "test4",
                    name: "test5",
                    notes: ["test6"],
                },
            ];
            getDatastreamSpy.mockReturnValue("testXml");
            getAgentsSpy.mockReturnValue(agents);

            const response = await datastreamManager.getAgents(pid, stream);

            expect(fedoraObjectBuildSpy).toHaveBeenCalledWith(pid);
            expect(getDatastreamSpy).toHaveBeenCalledWith(stream);
            expect(getAgentsSpy).toHaveBeenCalledWith("testXml");
            expect(response).toEqual(agents);
        });
    });

    describe("getProcessMetadata", () => {
        let pid;
        let stream;
        let getProcessMetadataSpy;
        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            getProcessMetadataSpy = jest.spyOn(MetadataExtractor.prototype, "getProcessMetadata");
        });

        it("returns process metadata", async () => {
            const metadata = { foo: "bar" };
            getDatastreamSpy.mockReturnValue("testXml");
            getProcessMetadataSpy.mockReturnValue(metadata);

            const response = await datastreamManager.getProcessMetadata(pid, stream);

            expect(fedoraObjectBuildSpy).toHaveBeenCalledWith(pid);
            expect(getDatastreamSpy).toHaveBeenCalledWith(stream);
            expect(getProcessMetadataSpy).toHaveBeenCalledWith("testXml");
            expect(response).toEqual(metadata);
        });
    });

    describe("deleteDatastream", () => {
        let deleteDatastreamSpy;
        let pid;
        let stream;
        beforeEach(() => {
            pid = "test1";
            stream = "test2";
            deleteDatastreamSpy = jest.spyOn(FedoraObject.prototype, "deleteDatastream");
        });

        it("deletes the datastream", async () => {
            deleteDatastreamSpy.mockResolvedValue({});

            await datastreamManager.deleteDatastream(pid, stream);

            expect(fedoraObjectBuildSpy).toHaveBeenCalledWith(pid);
            expect(deleteDatastreamSpy).toHaveBeenCalledWith(stream);
        });
    });
});
