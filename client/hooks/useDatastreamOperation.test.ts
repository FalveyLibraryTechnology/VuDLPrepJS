import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import useDatastreamOperation from "./useDatastreamOperation";

const mockUseGlobalContext = jest.fn();
jest.mock("../context/GlobalContext", () => ({
    useGlobalContext: () => {
        return mockUseGlobalContext();
    },
}));
const mockUseFetchContext = jest.fn();
jest.mock("../context/FetchContext", () => ({
    useFetchContext: () => {
        return mockUseFetchContext();
    },
}));
const mockUseEditorContext = jest.fn();
jest.mock("../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

describe("useDatastreamOperation", () => {
    let globalValues;
    let fetchValues;
    let editorValues;
    let currentPid;
    let currentDatastreams;
    let activeDatastream;
    let datastreamsCatalog;
    beforeEach(() => {
        currentPid =  "vudl:123";
        currentDatastreams = ["THUMBNAIL", "testDatastream"];
        activeDatastream = "THUMBNAIL";
        datastreamsCatalog = {
            THUMBNAIL: {
                mimetype: {
                    allowedType: "image",
                    allowedSubtypes: "png",
                },
            },
        };
        globalValues = {
            action: {
                setSnackbarState: jest.fn(),
                closeModal: jest.fn()
            },
        };
        fetchValues = {
            action: {
                fetchBlob: jest.fn(),
                fetchJSON: jest.fn(),
                fetchText: jest.fn()
            }
        };
        editorValues = {
            state: {
                currentPid,
                currentDatastreams,
                activeDatastream,
                datastreamsCatalog
            },
            action: {
                loadCurrentObjectDetails: jest.fn()
            },
        };
        mockUseGlobalContext.mockReturnValue(globalValues);
        mockUseFetchContext.mockReturnValue(fetchValues);
        mockUseEditorContext.mockReturnValue(editorValues);
    });

    describe("uploadFile", () => {
        it("uploads success", async () => {
            fetchValues.action.fetchText.mockResolvedValue("upload worked");

            const { uploadFile } = useDatastreamOperation();
            await uploadFile({
                type: "image/png",
            });


            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/THUMBNAIL",
                expect.objectContaining({
                    method: "POST",
                    body: expect.any(FormData),
                })
            );
            expect(editorValues.action.loadCurrentObjectDetails).toHaveBeenCalled();
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
                open: true,
                message: "upload worked",
                severity: "success",
            });
        });

        it("returns illegal mime type when type is invalid", async () => {
            const { uploadFile } = useDatastreamOperation();
            await uploadFile({
                type: "image/illegaltype",
            });
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
                open: true,
                message: expect.stringContaining("Illegal mime type"),
                severity: "error",
            });
            expect(globalValues.action.closeModal).toHaveBeenCalled();
        });

        it("returns illegal mime type when catalog cannot find datastream", async () => {
            editorValues.state.datastreamsCatalog = {};
            const { uploadFile } = useDatastreamOperation();

            await uploadFile({
                type: "image/png",
            });

            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
                open: true,
                message: expect.stringContaining("Illegal mime type"),
                severity: "error",
            });
            expect(globalValues.action.closeModal).toHaveBeenCalled();
        });
    });

    describe("uploadAgents", () => {
        let agents;
        beforeEach(() => {
            editorValues.state.activeDatastream = "AGENTS";
            agents = [{
                note: "test1",
                type: "test2",
                name: "test3",
                notes: [ "test4" ]
            }];
        });

        it("uploads an agent with success", async () => {
            fetchValues.action.fetchText.mockResolvedValue("upload agents worked");

            const { uploadAgents } = useDatastreamOperation();
            await uploadAgents(agents);

            expect(editorValues.action.loadCurrentObjectDetails).toHaveBeenCalled();
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/AGENTS/agents",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ agents }),
                }),
                { "Content-Type": "application/json"}
            );
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
                open: true,
                message: "upload agents worked",
                severity: "success",
            });
        });

        it("fails to upload the agents", async () => {
            fetchValues.action.fetchText.mockRejectedValue(new Error("Upload failure!"));

            const { uploadAgents } = useDatastreamOperation();
            await uploadAgents(agents);

            expect(editorValues.action.loadCurrentObjectDetails).not.toHaveBeenCalled();
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith("http://localhost:9000/api/edit/object/vudl%3A123/datastream/AGENTS/agents",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ agents }),
                }),
                { "Content-Type": "application/json"}
            );
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith(
                expect.objectContaining({
                    open: true,
                    message: "Upload failure!",
                    severity: "error"
                })
            );
        });
    });

    describe("uploadDublinCore", () => {
        let metadata;
        beforeEach(() => {
            metadata = {
                "dc:title": ["foo"],
            };
            editorValues.state.activeDatastream = "DC";
        });

        it("uploads DC with success", async () => {
            fetchValues.action.fetchText.mockResolvedValue("upload DC works");

            const { uploadDublinCore } = useDatastreamOperation();
            await uploadDublinCore(metadata);

            expect(editorValues.action.loadCurrentObjectDetails).toHaveBeenCalled();
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/DC/dublinCore",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ metadata }),
                }),
                { "Content-Type": "application/json"}
            );
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
                open: true,
                message: "upload DC works",
                severity: "success",
            });
        });

        it("fails to upload the DC", async () => {
            fetchValues.action.fetchText.mockRejectedValue(new Error("Upload failure!"));

            const { uploadDublinCore } = useDatastreamOperation();
            await uploadDublinCore(metadata);

            expect(editorValues.action.loadCurrentObjectDetails).not.toHaveBeenCalled();
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith("http://localhost:9000/api/edit/object/vudl%3A123/datastream/DC/dublinCore",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ metadata }),
                }),
                { "Content-Type": "application/json"}
            );
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith(
                expect.objectContaining({
                    open: true,
                    message: "Upload failure!",
                    severity: "error"
                })
            );
        });
    });

    describe("uploadLicense", () => {
        beforeEach(() => {
            editorValues.state.activeDatastream = "LICENSE";
        });

        it("uploads a license with success", async () => {
            fetchValues.action.fetchText.mockResolvedValue("upload license works");

            const { uploadLicense } = useDatastreamOperation();
            await uploadLicense("testLicenseKey");

            expect(editorValues.action.loadCurrentObjectDetails).toHaveBeenCalled();
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/LICENSE/license",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({licenseKey: "testLicenseKey"}),
                }),
                { "Content-Type": "application/json"}
            );
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
                open: true,
                message: "upload license works",
                severity: "success",
            });
        });

        it("fails to upload the license", async () => {
            fetchValues.action.fetchText.mockRejectedValue(new Error("Upload failure!"));

            const { uploadLicense } = useDatastreamOperation();
            await uploadLicense("testLicenseKey");

            expect(editorValues.action.loadCurrentObjectDetails).not.toHaveBeenCalled();
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith("http://localhost:9000/api/edit/object/vudl%3A123/datastream/LICENSE/license",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({licenseKey: "testLicenseKey"}),
                }),
                { "Content-Type": "application/json"}
            );
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith(
                expect.objectContaining({
                    open: true,
                    message: "Upload failure!",
                    severity: "error"
                })
            );
        });
    });

    describe("uploadProcessMetadata ", () => {
        beforeEach(() => {
            editorValues.state.activeDatastream = "PROCESS-MD";
        });

        it("uploads process metadata with success", async () => {
            fetchValues.action.fetchText.mockResolvedValue("upload works");

            const { uploadProcessMetadata  } = useDatastreamOperation();
            const input = { foo: "bar" };
            await uploadProcessMetadata(input);

            expect(editorValues.action.loadCurrentObjectDetails).toHaveBeenCalled();
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/PROCESS-MD/processMetadata",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({processMetadata: input}),
                }),
                { "Content-Type": "application/json"}
            );
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
                open: true,
                message: "upload works",
                severity: "success",
            });
        });

        it("fails to upload the process metadata", async () => {
            fetchValues.action.fetchText.mockRejectedValue(new Error("Upload failure!"));

            const { uploadProcessMetadata } = useDatastreamOperation();
            const input = { foo: "bar" };
            await uploadProcessMetadata(input);

            expect(editorValues.action.loadCurrentObjectDetails).not.toHaveBeenCalled();
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith("http://localhost:9000/api/edit/object/vudl%3A123/datastream/PROCESS-MD/processMetadata",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({processMetadata: input}),
                }),
                { "Content-Type": "application/json"}
            );
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith(
                expect.objectContaining({
                    open: true,
                    message: "Upload failure!",
                    severity: "error"
                })
            );
        });
    });

    describe("deleteDatastream", () => {
        it("deletes with success", async () => {
            fetchValues.action.fetchText.mockResolvedValue("Delete success!");

            const { deleteDatastream } = useDatastreamOperation();
            await deleteDatastream()

            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/THUMBNAIL",
                expect.objectContaining({
                    method: "DELETE",
                })
            );
            expect(editorValues.action.loadCurrentObjectDetails).toHaveBeenCalled();
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith(
                expect.objectContaining({
                    open: true,
                    message: "Delete success!",
                    severity: "success",
                })
            );
        });

        it("deletes with failure ", async () => {
            fetchValues.action.fetchText.mockRejectedValue(new Error("Delete failure!"));

            const { deleteDatastream } = useDatastreamOperation();
            await deleteDatastream()

            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/THUMBNAIL",
                expect.objectContaining({
                    method: "DELETE",
                })
            );

            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith(
                expect.objectContaining({
                    open: true,
                    message: "Delete failure!",
                    severity: "error",
                })
            );
        });
    });

    describe("downloadDatastream", () => {
        let blob: Blob;
        let headers;
        let createObjectURL;
        let createElementSpy;
        let link;
        let appendChildSpy;
        beforeEach(() => {
            blob = new Blob(["test"], {type: 'text/pdf'});
            headers = new Headers();
            createObjectURL = jest.fn().mockReturnValue("test3");
            link = {
                href: null,
                setAttribute: jest.fn(),
                click: jest.fn()
            };
            createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(link);
            appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(jest.fn());
            Object.defineProperty(global, "URL", {
                value: {
                    createObjectURL
                },
                writable: true,
            });
        });

        it("success", async () => {
            headers.append("Content-Type", "image/jpeg");
            headers.append("Content-Disposition", "attachment; filename=test.jpeg");
            fetchValues.action.fetchBlob.mockResolvedValue({
                headers,
                blob
            });
            const { downloadDatastream } = useDatastreamOperation();
            await downloadDatastream("test1");

            expect(createElementSpy).toHaveBeenCalledWith("a");
            expect(createObjectURL).toHaveBeenCalledWith(blob);
            expect(link.setAttribute).toHaveBeenCalledWith("download", "test.jpeg");
            expect(appendChildSpy).toHaveBeenCalledWith(link);
            expect(link.click).toHaveBeenCalled();
        });

        it("throws incorrect file type for non-existing mimetype", async () => {
            headers.append("Content-Type", "image/jpeg");
            blob = null;
            fetchValues.action.fetchBlob.mockResolvedValue({
                headers,
                blob
            });
            const { downloadDatastream } = useDatastreamOperation();
            await downloadDatastream("test1");

            expect(fetchValues.action.fetchBlob).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/test1/download"
            );

            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith(
                expect.objectContaining({
                    open: true,
                    message: "Incorrect file format",
                    severity: "error",
                })
            );
        });

        it("throws incorrect file type for undefined blob", async () => {
            fetchValues.action.fetchBlob.mockResolvedValue({
                headers,
                blob
            });
            const { downloadDatastream } = useDatastreamOperation();
            await downloadDatastream("test1");

            expect(fetchValues.action.fetchBlob).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/test1/download"
            );

            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith(
                expect.objectContaining({
                    open: true,
                    message: "Incorrect file format",
                    severity: "error",
                })
            );
        });

        it("error", async () => {
            fetchValues.action.fetchBlob.mockRejectedValue(new Error("Download failure!"));

            const { downloadDatastream } = useDatastreamOperation();
            await downloadDatastream("test1");

            expect(fetchValues.action.fetchBlob).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/test1/download"
            );

            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith(
                expect.objectContaining({
                    open: true,
                    message: "Download failure!",
                    severity: "error",
                })
            );
        });
    });

    describe("viewDatastream", () => {
        let blob: Blob;
        let headers: Headers;
        let createObjectURL: string;
        beforeEach(() => {
            blob = new Blob(["test"], {type: 'text/plain'});
            blob.text = jest.fn().mockResolvedValue("test4");
            headers = new Headers();
            createObjectURL = jest.fn().mockReturnValue("test3");
            Object.defineProperty(global, "URL", {
                value: {
                    createObjectURL
                },
                writable: true,
            });
        });

        it("success", async () => {
            headers.append("Content-Type", "image/jpeg");
            fetchValues.action.fetchBlob.mockResolvedValue({
                headers,
                blob
            });
            const { viewDatastream } = useDatastreamOperation();
            const response = await viewDatastream();

            expect(createObjectURL).toHaveBeenCalledWith(blob);
            expect(response.data).toEqual("test3");
            expect(response.mimeType).toEqual("image/jpeg");
        });

        it("calls text value", async () => {
            headers.append("Content-Type", "text/xml");
            fetchValues.action.fetchBlob.mockResolvedValue({
                headers,
                blob
            });
            const { viewDatastream } = useDatastreamOperation();
            const response = await viewDatastream();

            expect(createObjectURL).not.toHaveBeenCalledWith(blob);
            expect(response.mimeType).toEqual("text/xml");
            expect(response.data).toEqual("test4");
        });


        it("error", async () => {
            fetchValues.action.fetchBlob.mockRejectedValue(new Error("Download failure!"));

            const { viewDatastream } = useDatastreamOperation();
            await viewDatastream();

            expect(fetchValues.action.fetchBlob).toHaveBeenCalled();
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith(
                expect.objectContaining({
                    open: true,
                    severity: "error",
                })
            );
        });
    });

    describe("getLicenseKey", () => {

        beforeEach(() => {
            editorValues.state.activeDatastream = "LICENSE";
            editorValues.state.currentDatastreams = ["LICENSE"];
        });

        it("returns a license key for the active datastream", async () => {
            fetchValues.action.fetchText.mockResolvedValue("testLicense1");

            const { getLicenseKey } = useDatastreamOperation();
            const licenseKey = await getLicenseKey();

            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/LICENSE/license"
            );
            expect(licenseKey).toEqual("testLicense1");
        });


        it("fails to fetch the license key", async () => {
            fetchValues.action.fetchText.mockRejectedValue(new Error("fetch license failed"));

            const { getLicenseKey } = useDatastreamOperation();
            await getLicenseKey();

            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/LICENSE/license"
            );
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
                open: true,
                message: "fetch license failed",
                severity: "error"
            });
        });
    });

    describe("getAgents", () => {
        let expectedAgents;
        beforeEach(() => {
            expectedAgents = [{
                note: "test1",
                type: "test2",
                name: "test3",
                notes: [ "test4" ]
            }];
            editorValues.state.activeDatastream = "AGENTS";
            editorValues.state.currentDatastreams = ["AGENTS"];
        });

        it("returns agents for the active datastream", async () => {
            fetchValues.action.fetchJSON.mockResolvedValue(expectedAgents);

            const { getAgents } = useDatastreamOperation();
            const agents = await getAgents();

            expect(fetchValues.action.fetchJSON).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/AGENTS/agents"
            );
            expect(agents).toEqual(expectedAgents);
        });


        it("fails to fetch the agents", async () => {
            fetchValues.action.fetchJSON.mockRejectedValue(new Error("fetch agents failed"));

            const { getAgents } = useDatastreamOperation();
            await getAgents();

            expect(fetchValues.action.fetchJSON).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/AGENTS/agents"
            );
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
                open: true,
                message: "fetch agents failed",
                severity: "error"
            });
        });
    });

    describe("getProcessMetadata", () => {
        let expectedMetadata: Record<string, string>;
        beforeEach(() => {
            expectedMetadata = { foo: "bar" };
            editorValues.state.activeDatastream = "PROCESS-MD";
            editorValues.state.currentDatastreams = ["PROCESS-MD"];
        });

        it("returns process metadata for the active datastream", async () => {
            fetchValues.action.fetchJSON.mockResolvedValue(expectedMetadata);

            const { getProcessMetadata } = useDatastreamOperation();
            const agents = await getProcessMetadata();

            expect(fetchValues.action.fetchJSON).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/PROCESS-MD/processMetadata"
            );
            expect(agents).toEqual(expectedMetadata);
        });


        it("fails to fetch the process metadata", async () => {
            fetchValues.action.fetchJSON.mockRejectedValue(new Error("fetch process metadata failed"));

            const { getProcessMetadata } = useDatastreamOperation();
            await getProcessMetadata();

            expect(fetchValues.action.fetchJSON).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/vudl%3A123/datastream/PROCESS-MD/processMetadata"
            );
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
                open: true,
                message: "fetch process metadata failed",
                severity: "error"
            });
        });
    });
});
