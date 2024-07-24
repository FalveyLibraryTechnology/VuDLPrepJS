import * as request from "supertest";
import { StatusCodes } from "http-status-codes";
import app from "../app";
import edit from "./edit";
import Config from "../models/Config";
import DatastreamManager from "../services/DatastreamManager";
import Fedora from "../services/Fedora";
import FedoraCatalog from "../services/FedoraCatalog";
import { CompleteCatalog } from "../services/FedoraCatalog";
import FedoraObjectFactory from "../services/FedoraObjectFactory";
import FedoraDataCollector from "../services/FedoraDataCollector";
import Database from "../services/Database";
import FedoraDataCollection from "../models/FedoraDataCollection";
import { FedoraObject } from "../models/FedoraObject";
import Solr from "../services/Solr";
import { NeedleResponse } from "../services/interfaces";
import { IncomingForm } from "formidable";

jest.mock("../services/DatastreamManager");
jest.mock("formidable");

describe("edit", () => {
    let config;
    let pid;
    let datastream;
    beforeAll(() => {
        app.use("/edit", edit);
        config = {
            base_url: "www.test.com",
            allowed_origins: ["http://localhost:3000", "http://localhost:9000"],
        };
        Config.setInstance(new Config(config));
        pid = "foo:123";
        datastream = "test1";
    });

    describe("get /catalog", () => {
        beforeEach(() => {
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("returns the complete catalog", async () => {
            const fakeCatalog: CompleteCatalog = {
                agents: { defaults: {}, roles: [], types: [] },
                dublinCoreFields: {},
                licenses: {},
                models: {},
                processMetadataDefaults: {},
                toolPresets: [],
                favoritePids: {},
                topLevelPids: [],
                vufindUrl: "",
            };
            const spy = jest.spyOn(FedoraCatalog.getInstance(), "getCompleteCatalog").mockResolvedValue(fakeCatalog);
            const response = await request(app)
                .get("/edit/catalog")
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(response.text).toEqual(JSON.stringify(fakeCatalog));
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe("get /catalog/models", () => {
        beforeEach(() => {
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("returns the catalog of models", async () => {
            const fakeCatalog = ["foo", "bar"];
            const spy = jest.spyOn(FedoraCatalog.getInstance(), "getModelCatalog").mockReturnValue(fakeCatalog);
            const response = await request(app)
                .get("/edit/catalog/models")
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(response.text).toEqual(JSON.stringify(fakeCatalog));
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe("get /catalog/datastreams", () => {
        beforeEach(() => {
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("returns the catalog of datastreams", async () => {
            const fakeCatalog = ["foo", "bar"];
            const spy = jest.spyOn(FedoraCatalog.getInstance(), "getDatastreamCatalog").mockReturnValue(fakeCatalog);
            const response = await request(app)
                .get("/edit/catalog/datastreams")
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(response.text).toEqual(JSON.stringify(fakeCatalog));
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe("get /catalog/datastreammimetypes", () => {
        beforeEach(() => {
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("returns the catalog of datastream MIME types", async () => {
            const fakeCatalog = { foo: {} };
            const spy = jest.spyOn(FedoraCatalog.getInstance(), "getDatastreamMimetypes").mockReturnValue(fakeCatalog);
            const response = await request(app)
                .get("/edit/catalog/datastreammimetypes")
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(response.text).toEqual(JSON.stringify(fakeCatalog));
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe("get /catalog/dublinCoreFields", () => {
        beforeEach(() => {
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("returns the Dublin Core fields", async () => {
            const fakeCatalog = { foo: { baz: "bar" } };
            const spy = jest.spyOn(FedoraCatalog.getInstance(), "getDublinCoreFields").mockReturnValue(fakeCatalog);
            const response = await request(app)
                .get("/edit/catalog/dublinCoreFields")
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(response.text).toEqual(JSON.stringify(fakeCatalog));
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe("get /catalog/favoritePids", () => {
        beforeEach(() => {
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("returns the catalog of favorite PIDs", async () => {
            const fakeCatalog = { foo: "bar" };
            const spy = jest.spyOn(FedoraCatalog.getInstance(), "getFavoritePids").mockResolvedValue(fakeCatalog);
            const response = await request(app)
                .get("/edit/catalog/favoritePids")
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(response.text).toEqual(JSON.stringify(fakeCatalog));
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe("post /object/new", () => {
        beforeEach(() => {
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("requires a model parameter", async () => {
            const response = await request(app)
                .post("/edit/object/new")
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.text).toEqual("Missing model parameter.");
        });
        it("requires a valid model parameter", async () => {
            const response = await request(app)
                .post("/edit/object/new")
                .send({ model: "vudl-system:UnsupportedValue" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.text).toEqual("Unrecognized model vudl-system:UnsupportedValue.");
        });
        it("requires a title parameter", async () => {
            const response = await request(app)
                .post("/edit/object/new")
                .send({ model: "vudl-system:FolderCollection" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.text).toEqual("Missing title parameter.");
        });
        it("requires a state parameter", async () => {
            const response = await request(app)
                .post("/edit/object/new")
                .send({ model: "vudl-system:FolderCollection", title: "bar" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.text).toEqual("Missing state parameter.");
        });
        it("will fail if parent does not have collection model", async () => {
            const mockData = FedoraDataCollection.build("pid:123");
            const collector = FedoraDataCollector.getInstance();
            const dataSpy = jest.spyOn(collector, "getObjectData").mockResolvedValue(mockData);
            const response = await request(app)
                .post("/edit/object/new")
                .send({ model: "vudl-system:FolderCollection", title: "bar", state: "Active", parent: "pid:123" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.text).toEqual("Illegal parent pid:123; not a collection!");
            expect(dataSpy).toHaveBeenCalledTimes(1);
            expect(dataSpy).toHaveBeenCalledWith("pid:123");
        });
        it("will fail if data is added to a non-list model", async () => {
            const mockData = FedoraDataCollection.build("pid:123");
            mockData.fedoraDetails = {
                hasModel: [
                    "http://localhost:8080/rest/vudl-system:FolderCollection",
                    "http://localhost:8080/rest/vudl-system:CoreModel",
                    "http://localhost:8080/rest/vudl-system:CollectionModel",
                ],
            };
            const collector = FedoraDataCollector.getInstance();
            const dataSpy = jest.spyOn(collector, "getObjectData").mockResolvedValue(mockData);
            const response = await request(app)
                .post("/edit/object/new")
                .send({ model: "vudl-system:ImageData", title: "bar", state: "Active", parent: "pid:123" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.text).toEqual("DataModel objects must be contained by a ListCollection");
            expect(dataSpy).toHaveBeenCalledTimes(1);
            expect(dataSpy).toHaveBeenCalledWith("pid:123");
        });
        it("will fail if list is added to a non-resource model", async () => {
            const mockData = FedoraDataCollection.build("pid:123");
            mockData.fedoraDetails = {
                hasModel: [
                    "http://localhost:8080/rest/vudl-system:FolderCollection",
                    "http://localhost:8080/rest/vudl-system:CoreModel",
                    "http://localhost:8080/rest/vudl-system:CollectionModel",
                ],
            };
            const collector = FedoraDataCollector.getInstance();
            const dataSpy = jest.spyOn(collector, "getObjectData").mockResolvedValue(mockData);
            const response = await request(app)
                .post("/edit/object/new")
                .send({ model: "vudl-system:ListCollection", title: "bar", state: "Active", parent: "pid:123" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.text).toEqual("ListCollection objects must be contained by a ResourceCollection");
            expect(dataSpy).toHaveBeenCalledTimes(1);
            expect(dataSpy).toHaveBeenCalledWith("pid:123");
        });
        it("will fail if resource is added to a non-folder model", async () => {
            const mockData = FedoraDataCollection.build("pid:123");
            mockData.fedoraDetails = {
                hasModel: [
                    "http://localhost:8080/rest/vudl-system:ResourceCollection",
                    "http://localhost:8080/rest/vudl-system:CoreModel",
                    "http://localhost:8080/rest/vudl-system:CollectionModel",
                ],
            };
            const collector = FedoraDataCollector.getInstance();
            const dataSpy = jest.spyOn(collector, "getObjectData").mockResolvedValue(mockData);
            const response = await request(app)
                .post("/edit/object/new")
                .send({ model: "vudl-system:ResourceCollection", title: "bar", state: "Active", parent: "pid:123" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.text).toEqual("ResourceCollection objects must be contained by a FolderCollection");
            expect(dataSpy).toHaveBeenCalledTimes(1);
            expect(dataSpy).toHaveBeenCalledWith("pid:123");
        });
        it("will fail if folder is added to a non-folder model", async () => {
            const mockData = FedoraDataCollection.build("pid:123");
            mockData.fedoraDetails = {
                hasModel: [
                    "http://localhost:8080/rest/vudl-system:ResourceCollection",
                    "http://localhost:8080/rest/vudl-system:CoreModel",
                    "http://localhost:8080/rest/vudl-system:CollectionModel",
                ],
            };
            const collector = FedoraDataCollector.getInstance();
            const dataSpy = jest.spyOn(collector, "getObjectData").mockResolvedValue(mockData);
            const response = await request(app)
                .post("/edit/object/new")
                .send({ model: "vudl-system:FolderCollection", title: "bar", state: "Active", parent: "pid:123" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.text).toEqual("FolderCollection objects must be contained by a FolderCollection");
            expect(dataSpy).toHaveBeenCalledTimes(1);
            expect(dataSpy).toHaveBeenCalledWith("pid:123");
        });
        it("handles data retrieval exceptions", async () => {
            const mockData = FedoraDataCollection.build("pid:123");
            mockData.fedoraDetails = {
                hasModel: [
                    "http://localhost:8080/rest/vudl-system:FolderCollection",
                    "http://localhost:8080/rest/vudl-system:CoreModel",
                    "http://localhost:8080/rest/vudl-system:CollectionModel",
                ],
            };
            const collector = FedoraDataCollector.getInstance();
            const kaboom = new Error("kaboom!");
            const dataSpy = jest.spyOn(collector, "getObjectData").mockImplementation(() => {
                throw kaboom;
            });
            const response = await request(app)
                .post("/edit/object/new")
                .send({ model: "vudl-system:FolderCollection", title: "bar", state: "Active", parent: "pid:123" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.NOT_FOUND);
            expect(response.text).toEqual("Error loading parent PID: pid:123");
            expect(dataSpy).toHaveBeenCalledTimes(1);
            expect(dataSpy).toHaveBeenCalledWith("pid:123");
        });
        it("handles build exceptions", async () => {
            const mockData = FedoraDataCollection.build("pid:123");
            mockData.fedoraDetails = {
                hasModel: [
                    "http://localhost:8080/rest/vudl-system:FolderCollection",
                    "http://localhost:8080/rest/vudl-system:CoreModel",
                    "http://localhost:8080/rest/vudl-system:CollectionModel",
                ],
            };
            const collector = FedoraDataCollector.getInstance();
            const dataSpy = jest.spyOn(collector, "getObjectData").mockResolvedValue(mockData);
            const factory = FedoraObjectFactory.getInstance();
            const kaboom = new Error("kaboom!");
            const factorySpy = jest.spyOn(factory, "build").mockImplementation(() => {
                throw kaboom;
            });
            const consoleSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            const response = await request(app)
                .post("/edit/object/new")
                .send({ model: "vudl-system:FolderCollection", title: "bar", state: "Active", parent: "pid:123" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.text).toEqual("kaboom!");
            expect(consoleSpy).toHaveBeenCalledWith(kaboom);
            expect(dataSpy).toHaveBeenCalledTimes(1);
            expect(dataSpy).toHaveBeenCalledWith("pid:123");
            expect(factorySpy).toHaveBeenCalledTimes(1);
            expect(factorySpy).toHaveBeenCalledWith("FolderCollection", "bar", "Active", "pid:123");
        });
        it("will succeed if parent has collection model", async () => {
            const mockData = FedoraDataCollection.build("pid:123");
            mockData.fedoraDetails = {
                hasModel: [
                    "http://localhost:8080/rest/vudl-system:FolderCollection",
                    "http://localhost:8080/rest/vudl-system:CoreModel",
                    "http://localhost:8080/rest/vudl-system:CollectionModel",
                ],
            };
            const collector = FedoraDataCollector.getInstance();
            const dataSpy = jest.spyOn(collector, "getObjectData").mockResolvedValue(mockData);
            const factory = FedoraObjectFactory.getInstance();
            const newObject = FedoraObject.build("child:123");
            const factorySpy = jest.spyOn(factory, "build").mockResolvedValue(newObject);
            const response = await request(app)
                .post("/edit/object/new")
                .send({ model: "vudl-system:FolderCollection", title: "bar", state: "Active", parent: "pid:123" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(response.text).toEqual("child:123");
            expect(dataSpy).toHaveBeenCalledTimes(1);
            expect(dataSpy).toHaveBeenCalledWith("pid:123");
            expect(factorySpy).toHaveBeenCalledTimes(1);
            expect(factorySpy).toHaveBeenCalledWith("FolderCollection", "bar", "Active", "pid:123");
        });
    });

    describe("post /object/:pid/datastream/:stream", () => {
        let datastreamManager;
        const filepath = "/foo/bar";
        const mimetype = "text/fake";
        beforeEach(() => {
            datastreamManager = {
                uploadFile: jest.fn(),
            };
            datastream = "THUMBNAIL";
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
            jest.spyOn(DatastreamManager, "getInstance").mockReturnValue(datastreamManager);
        });

        it("accepts an arbitrary upload", async () => {
            let lastOptions = {};
            IncomingForm.mockImplementation((options) => {
                lastOptions = options;
                return {
                    parse: (req, callback) => {
                        callback(
                            false,
                            {},
                            {
                                file: { filepath, mimetype },
                            },
                        );
                    },
                };
            });
            datastreamManager.uploadFile.mockResolvedValue({});
            await request(app)
                .post(`/edit/object/${pid}/datastream/${datastream}`)
                .set("Authorization", "Bearer test")
                .send()
                .set("Accept", "application/json")
                .expect(StatusCodes.OK);
            expect(lastOptions).toEqual({ multiples: true, maxFileSize: 200 * 1024 * 1024 });
            expect(datastreamManager.uploadFile).toHaveBeenCalledWith(pid, datastream, filepath, mimetype);
        });

        it("handles exceptions", async () => {
            IncomingForm.mockImplementation(() => {
                return {
                    parse: (req, callback) => {
                        callback(
                            false,
                            {},
                            {
                                file: { filepath, mimetype },
                            },
                        );
                    },
                };
            });
            const kaboom = new Error("kaboom");
            datastreamManager.uploadFile.mockImplementation(() => {
                throw kaboom;
            });
            const consoleSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            const response = await request(app)
                .post(`/edit/object/${pid}/datastream/${datastream}`)
                .set("Authorization", "Bearer test")
                .send()
                .set("Accept", "application/json")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);

            expect(response.error.text).toEqual("kaboom");
            expect(consoleSpy).toHaveBeenCalledWith(kaboom);
        });
    });

    describe("post /object/:pid/datastream/:stream/dublinCore", () => {
        let datastreamManager;
        let metadata;
        beforeEach(() => {
            datastreamManager = {
                uploadDublinCoreMetadata: jest.fn(),
            };
            metadata = "<dc />";
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
            jest.spyOn(DatastreamManager, "getInstance").mockReturnValue(datastreamManager);
        });

        it("uploads Dublin Core", async () => {
            datastreamManager.uploadDublinCoreMetadata.mockResolvedValue({});

            await request(app)
                .post(`/edit/object/${pid}/datastream/${datastream}/dublinCore`)
                .set("Authorization", "Bearer test")
                .send({ metadata })
                .set("Accept", "application/json")
                .expect(StatusCodes.OK);

            expect(datastreamManager.uploadDublinCoreMetadata).toHaveBeenCalledWith(pid, datastream, metadata);
        });

        it("handles exceptions", async () => {
            datastreamManager.uploadDublinCoreMetadata.mockImplementation(() => {
                throw new Error("kaboom");
            });

            const response = await request(app)
                .post(`/edit/object/${pid}/datastream/${datastream}/dublinCore`)
                .set("Authorization", "Bearer test")
                .send({ metadata })
                .set("Accept", "application/json")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);

            expect(response.error.text).toEqual("kaboom");
        });
    });

    describe("post /object/:pid/datastream/:stream/license", () => {
        let datastreamManager;
        let licenseKey;
        beforeEach(() => {
            datastreamManager = {
                uploadLicense: jest.fn(),
            };
            licenseKey = "testLicenseKey";
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
            jest.spyOn(DatastreamManager, "getInstance").mockReturnValue(datastreamManager);
        });

        it("uploads a license", async () => {
            datastreamManager.uploadLicense.mockResolvedValue({});

            await request(app)
                .post(`/edit/object/${pid}/datastream/${datastream}/license`)
                .set("Authorization", "Bearer test")
                .send({ licenseKey })
                .set("Accept", "application/json")
                .expect(StatusCodes.OK);

            expect(datastreamManager.uploadLicense).toHaveBeenCalledWith(pid, datastream, licenseKey);
        });
    });

    describe("post /object/:pid/datastream/:stream/agents", () => {
        let datastreamManager;
        let agents;
        beforeEach(() => {
            datastreamManager = {
                uploadAgents: jest.fn(),
            };
            agents = [
                {
                    role: "test1",
                    type: "test2",
                    name: "test3",
                    notes: ["test4", "test5"],
                },
            ];
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
            jest.spyOn(DatastreamManager, "getInstance").mockReturnValue(datastreamManager);
        });

        it("uploads agents", async () => {
            datastreamManager.uploadAgents.mockResolvedValue({});

            await request(app)
                .post(`/edit/object/${pid}/datastream/${datastream}/agents`)
                .set("Authorization", "Bearer test")
                .send({ agents })
                .set("Accept", "application/json")
                .expect(StatusCodes.OK);

            expect(datastreamManager.uploadAgents).toHaveBeenCalledWith(pid, datastream, agents);
        });

        it("sends an error status code", async () => {
            datastreamManager.uploadAgents.mockRejectedValue("upload agents failed");

            await request(app)
                .post(`/edit/object/${pid}/datastream/${datastream}/agents`)
                .set("Authorization", "Bearer test")
                .send({ agents })
                .set("Accept", "application/json")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
        });
    });

    describe("get /object/:pid/datastream/:stream/agents", () => {
        let datastreamManager;
        let agents;
        beforeEach(() => {
            datastreamManager = {
                getAgents: jest.fn(),
            };
            agents = [
                {
                    role: "test1",
                    type: "test2",
                    name: "test3",
                    notes: ["test4"],
                },
            ];
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
            jest.spyOn(DatastreamManager, "getInstance").mockReturnValue(datastreamManager);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("gets the agents", async () => {
            datastreamManager.getAgents.mockResolvedValue(agents);

            const response = await request(app)
                .get(`/edit/object/${pid}/datastream/${datastream}/agents`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(response.body).toEqual(agents);
            expect(datastreamManager.getAgents).toHaveBeenCalledWith(pid, datastream);
        });

        it("sends an error status code", async () => {
            datastreamManager.getAgents.mockRejectedValue("get agents fails");

            await request(app)
                .get(`/edit/object/${pid}/datastream/${datastream}/agents`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
        });
    });

    describe("post /object/:pid/datastream/:stream/processMetadata", () => {
        let datastreamManager;
        let processMetadata;
        beforeEach(() => {
            datastreamManager = {
                uploadProcessMetadata: jest.fn(),
            };
            processMetadata = { foo: "bar" };
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
            jest.spyOn(DatastreamManager, "getInstance").mockReturnValue(datastreamManager);
        });

        it("uploads metadata", async () => {
            datastreamManager.uploadProcessMetadata.mockResolvedValue({});

            await request(app)
                .post(`/edit/object/${pid}/datastream/${datastream}/processMetadata`)
                .set("Authorization", "Bearer test")
                .send({ processMetadata })
                .set("Accept", "application/json")
                .expect(StatusCodes.OK);

            expect(datastreamManager.uploadProcessMetadata).toHaveBeenCalledWith(pid, datastream, processMetadata);
        });

        it("sends an error status code", async () => {
            datastreamManager.uploadProcessMetadata.mockRejectedValue("upload processMetadata failed");

            await request(app)
                .post(`/edit/object/${pid}/datastream/${datastream}/processMetadata`)
                .set("Authorization", "Bearer test")
                .send({ processMetadata })
                .set("Accept", "application/json")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
        });
    });

    describe("get /object/:pid/datastream/:stream/processMetadata", () => {
        let datastreamManager;
        let processMetadata;
        beforeEach(() => {
            datastreamManager = {
                getProcessMetadata: jest.fn(),
            };
            processMetadata = { foo: "bar" };
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
            jest.spyOn(DatastreamManager, "getInstance").mockReturnValue(datastreamManager);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("gets the metadata", async () => {
            datastreamManager.getProcessMetadata.mockResolvedValue(processMetadata);

            const response = await request(app)
                .get(`/edit/object/${pid}/datastream/${datastream}/processMetadata`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(response.body).toEqual(processMetadata);
            expect(datastreamManager.getProcessMetadata).toHaveBeenCalledWith(pid, datastream);
        });

        it("sends an error status code", async () => {
            datastreamManager.getProcessMetadata.mockRejectedValue("get processMetadata fails");

            await request(app)
                .get(`/edit/object/${pid}/datastream/${datastream}/processMetadata`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
        });
    });

    describe("get /object/:pid/datastream/:stream/license", () => {
        let datastreamManager;
        let licenseKey;
        beforeEach(() => {
            datastreamManager = {
                getLicenseKey: jest.fn(),
            };
            licenseKey = "testLicenseKey";
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
            jest.spyOn(DatastreamManager, "getInstance").mockReturnValue(datastreamManager);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("gets the license key", async () => {
            datastreamManager.getLicenseKey.mockResolvedValue(licenseKey);

            const response = await request(app)
                .get(`/edit/object/${pid}/datastream/${datastream}/license`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(response.text).toEqual(licenseKey);
            expect(datastreamManager.getLicenseKey).toHaveBeenCalledWith(pid, datastream);
        });

        it("sends an error status code", async () => {
            datastreamManager.getLicenseKey.mockRejectedValue("get license key fails");

            await request(app)
                .get(`/edit/object/${pid}/datastream/${datastream}/license`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
        });
    });

    describe("delete /object/:pid/datastream/:stream", () => {
        let datastreamManager;
        beforeEach(() => {
            datastreamManager = {
                deleteDatastream: jest.fn(),
            };
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
            jest.spyOn(DatastreamManager, "getInstance").mockReturnValue(datastreamManager);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("will delete a datastream", async () => {
            datastreamManager.deleteDatastream.mockResolvedValue({});

            await request(app)
                .delete(`/edit/object/${pid}/datastream/${datastream}`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);

            expect(datastreamManager.deleteDatastream).toHaveBeenCalledWith(pid, datastream);
        });
    });

    describe("get /object/:pid/datastream/:stream/download", () => {
        let datastreamManager;
        let mimeType;
        let buffer;
        beforeEach(() => {
            mimeType = "text/xml";
            buffer = Buffer.from("test2");
            datastreamManager = {
                getMimeType: jest.fn(),
                downloadBuffer: jest.fn(),
            };
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
            jest.spyOn(DatastreamManager, "getInstance").mockReturnValue(datastreamManager);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("will download the datastream content", async () => {
            datastreamManager.getMimeType.mockResolvedValue(mimeType);
            datastreamManager.downloadBuffer.mockResolvedValue(buffer);

            await request(app)
                .get(`/edit/object/${pid}/datastream/${datastream}/download`)
                .set("Authorization", "Bearer test")
                .expect("Content-Disposition", `attachment; filename=foo_123_${datastream}.xml`)
                .expect("Content-Type", mimeType + "; charset=utf-8")
                .expect(StatusCodes.OK);

            expect(datastreamManager.getMimeType).toHaveBeenCalledWith(pid, datastream);
            expect(datastreamManager.downloadBuffer).toHaveBeenCalledWith(pid, datastream);
        });
    });

    describe("get /object/:pid/datastream/:stream/view", () => {
        let datastreamManager;
        let mimeType;
        let buffer;
        beforeEach(() => {
            mimeType = "text/xml";
            buffer = Buffer.from("test2");
            datastreamManager = {
                getMimeType: jest.fn(),
                downloadBuffer: jest.fn(),
            };
            jest.spyOn(Database.getInstance(), "confirmToken").mockResolvedValue(true);
            jest.spyOn(DatastreamManager, "getInstance").mockReturnValue(datastreamManager);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("will view the datastream content", async () => {
            datastreamManager.getMimeType.mockResolvedValue(mimeType);
            datastreamManager.downloadBuffer.mockResolvedValue(buffer);

            await request(app)
                .get(`/edit/object/${pid}/datastream/${datastream}/view`)
                .set("Authorization", "Bearer test")
                .expect("Content-Disposition", "inline")
                .expect("Content-Type", mimeType + "; charset=utf-8")
                .expect(StatusCodes.OK);

            expect(datastreamManager.getMimeType).toHaveBeenCalledWith(pid, datastream);
            expect(datastreamManager.downloadBuffer).toHaveBeenCalledWith(pid, datastream);
        });
    });

    describe("get /topLevelObjects", () => {
        let querySpy;
        beforeEach(() => {
            const solrResponse = { statusCode: 200, body: { response: { foo: "bar" } } };
            querySpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue(solrResponse as NeedleResponse);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("will run an appropriate Solr query with default params", async () => {
            const response = await request(app)
                .get(`/edit/topLevelObjects`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledWith("biblio", "-fedora_parent_id_str_mv:*", {
                fl: "id,title",
                rows: "100000",
                sort: "title_sort ASC",
                start: "0",
            });
            expect(response.text).toEqual('{"foo":"bar"}');
        });
        it("allows start and rows to be overridden", async () => {
            const response = await request(app)
                .get(`/edit/topLevelObjects`)
                .query({ rows: "100", start: "200" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledWith("biblio", "-fedora_parent_id_str_mv:*", {
                fl: "id,title",
                rows: "100",
                sort: "title_sort ASC",
                start: "200",
            });
            expect(response.text).toEqual('{"foo":"bar"}');
        });
    });

    describe("get /object/:pid/childCounts", () => {
        let querySpy;
        const solrResponse = { statusCode: 200, body: { response: { numFound: 0 } } };
        beforeEach(() => {
            querySpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue(solrResponse as NeedleResponse);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("will run appropriate Solr queries", async () => {
            const response1 = JSON.parse(JSON.stringify(solrResponse));
            response1.body.response.numFound = 5;
            const response2 = JSON.parse(JSON.stringify(solrResponse));
            response2.body.response.numFound = 100;
            querySpy.mockResolvedValueOnce(response1);
            querySpy.mockResolvedValueOnce(response2);
            const response = await request(app)
                .get(`/edit/object/${pid}/childCounts`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledTimes(2);
            expect(querySpy).toHaveBeenCalledWith("biblio", 'fedora_parent_id_str_mv:"foo:123"', {
                rows: "0",
            });
            expect(querySpy).toHaveBeenCalledWith("biblio", 'hierarchy_all_parents_str_mv:"foo:123"', {
                rows: "0",
            });
            expect(response.text).toEqual('{"directChildren":5,"totalDescendants":100}');
        });
        it("handles Solr errors in the first query", async () => {
            const response1 = JSON.parse(JSON.stringify(solrResponse));
            response1.statusCode = 500;
            querySpy.mockResolvedValueOnce(response1);
            await request(app)
                .get(`/edit/object/${pid}/childCounts`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
        });
        it("handles Solr errors in the second query", async () => {
            const response1 = JSON.parse(JSON.stringify(solrResponse));
            response1.body.response.numFound = 5;
            const response2 = JSON.parse(JSON.stringify(solrResponse));
            response2.statusCode = 500;
            querySpy.mockResolvedValueOnce(response1);
            querySpy.mockResolvedValueOnce(response2);
            await request(app)
                .get(`/edit/object/${pid}/childCounts`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
        });
    });

    describe("get /object/:pid/children", () => {
        let querySpy;
        const solrResponse = { statusCode: 200, body: { response: { foo: "bar" } } };
        beforeEach(() => {
            querySpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue(solrResponse as NeedleResponse);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("will run an appropriate Solr query with default params", async () => {
            const response = await request(app)
                .get(`/edit/object/${pid}/children`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledWith("biblio", 'fedora_parent_id_str_mv:"foo:123"', {
                fl: "id,title",
                rows: "100000",
                sort: "sequence_foo_123_str ASC,title_sort ASC",
                start: "0",
            });
            expect(response.text).toEqual('{"foo":"bar"}');
        });
        it("allows start and rows to be overridden", async () => {
            const response = await request(app)
                .get(`/edit/object/${pid}/children`)
                .query({ rows: "100", start: "200" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledWith("biblio", 'fedora_parent_id_str_mv:"foo:123"', {
                fl: "id,title",
                rows: "100",
                sort: "sequence_foo_123_str ASC,title_sort ASC",
                start: "200",
            });
            expect(response.text).toEqual('{"foo":"bar"}');
        });
        it("handles Solr errors in the query", async () => {
            const response1 = JSON.parse(JSON.stringify(solrResponse));
            response1.statusCode = 500;
            querySpy.mockResolvedValueOnce(response1);
            await request(app)
                .get(`/edit/object/${pid}/children`)
                .query({ rows: "100", start: "200" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
        });
    });

    describe("get /object/:pid/lastChildPosition", () => {
        let querySpy;
        beforeEach(() => {
            const solrResponse = { statusCode: 200, body: { response: { docs: [{ sequence_foo_123_str: "100" }] } } };
            querySpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue(solrResponse as NeedleResponse);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("will run an appropriate Solr query and parse the response", async () => {
            const response = await request(app)
                .get(`/edit/object/${pid}/lastChildPosition`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledWith("biblio", 'fedora_parent_id_str_mv:"foo:123"', {
                fl: "sequence_foo_123_str",
                rows: "1",
                sort: "sequence_foo_123_str DESC",
            });
            expect(response.text).toEqual("100");
        });
    });

    describe("get /object/:pid/recursiveChildPids", () => {
        let querySpy;
        beforeEach(() => {
            const solrResponse = { statusCode: 200, body: { response: { foo: "bar" } } };
            querySpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue(solrResponse as NeedleResponse);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("will run an appropriate Solr query with default params", async () => {
            const response = await request(app)
                .get(`/edit/object/${pid}/recursiveChildPids`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledWith("biblio", 'hierarchy_all_parents_str_mv:"foo:123"', {
                fl: "id",
                rows: "100000",
                sort: "id ASC",
                start: "0",
            });
            expect(response.text).toEqual('{"foo":"bar"}');
        });
        it("allows start and rows to be overridden", async () => {
            const response = await request(app)
                .get(`/edit/object/${pid}/recursiveChildPids`)
                .query({ rows: "100", start: "200" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledWith("biblio", 'hierarchy_all_parents_str_mv:"foo:123"', {
                fl: "id",
                rows: "100",
                sort: "id ASC",
                start: "200",
            });
            expect(response.text).toEqual('{"foo":"bar"}');
        });
    });

    describe("get /object/:pid/directChildPids", () => {
        let querySpy;
        let solrResponse = {};
        beforeEach(() => {
            solrResponse = { statusCode: 200, body: { response: { foo: "bar" } } };
            querySpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue(solrResponse as NeedleResponse);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("will run an appropriate Solr query with default params", async () => {
            const response = await request(app)
                .get(`/edit/object/${pid}/directChildPids`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledWith("biblio", 'fedora_parent_id_str_mv:"foo:123"', {
                fl: "id",
                rows: "100000",
                sort: "id ASC",
                start: "0",
            });
            expect(response.text).toEqual('{"foo":"bar"}');
        });
        it("allows sort, start and rows to be overridden", async () => {
            const response = await request(app)
                .get(`/edit/object/${pid}/directChildPids`)
                .query({ rows: "100", start: "200", sort: "title_sort ASC,id ASC" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledWith("biblio", 'fedora_parent_id_str_mv:"foo:123"', {
                fl: "id",
                rows: "100",
                sort: "title_sort ASC,id ASC",
                start: "200",
            });
            expect(response.text).toEqual('{"foo":"bar"}');
        });
        it("handles Solr errors", async () => {
            (solrResponse as Record<string, unknown>).statusCode = 500;
            const response = await request(app)
                .get(`/edit/object/${pid}/directChildPids`)
                .query({ rows: "100", start: "200", sort: "title_sort ASC,id ASC" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
            expect(querySpy).toHaveBeenCalledWith("biblio", 'fedora_parent_id_str_mv:"foo:123"', {
                fl: "id",
                rows: "100",
                sort: "title_sort ASC,id ASC",
                start: "200",
            });
            expect(response.text).toEqual("Unexpected Solr response code.");
        });
    });

    describe("put /object/:pid/state", () => {
        it("will reject invalid states", async () => {
            const response = await request(app)
                .put(`/edit/object/${pid}/state`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("Illegal")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.error.text).toEqual("Illegal state: Illegal");
        });

        it("will accept a valid state", async () => {
            const fedora = Fedora.getInstance();
            const stateSpy = jest.spyOn(fedora, "modifyObjectState").mockImplementation(jest.fn());

            await request(app)
                .put(`/edit/object/${pid}/state`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("Active")
                .expect(StatusCodes.OK);

            expect(stateSpy).toHaveBeenCalledWith(pid, "Active");
        });
    });

    describe("put /object/:pid/sortOn", () => {
        it("will reject invalid sort values", async () => {
            const response = await request(app)
                .put(`/edit/object/${pid}/sortOn`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("Illegal")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.error.text).toEqual("Unrecognized sortOn value: Illegal. Legal values: custom, title");
        });

        it("will accept a valid sort value", async () => {
            const fedora = Fedora.getInstance();
            const updateSpy = jest.spyOn(fedora, "updateSortOnRelationship").mockImplementation(jest.fn());

            await request(app)
                .put(`/edit/object/${pid}/sortOn`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("custom")
                .expect(StatusCodes.OK);

            expect(updateSpy).toHaveBeenCalledWith(pid, "custom");
        });

        it("handles Fedora exceptions appropriately", async () => {
            const fedora = Fedora.getInstance();
            const ex = new Error("kaboom");
            const updateSpy = jest.spyOn(fedora, "updateSortOnRelationship").mockImplementation(() => {
                throw ex;
            });
            const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());

            await request(app)
                .put(`/edit/object/${pid}/sortOn`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("custom")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);

            expect(updateSpy).toHaveBeenCalledWith(pid, "custom");
            expect(errorSpy).toHaveBeenCalledWith(ex);
        });
    });

    describe("put /object/:pid/parent/:parentPid", () => {
        let parentPid: string;
        let mockData: FedoraDataCollection;
        let mockObject;
        let buildSpy;
        beforeEach(() => {
            parentPid = "foo:100";
            mockData = FedoraDataCollection.build(parentPid);
            const collector = FedoraDataCollector.getInstance();
            jest.spyOn(collector, "getHierarchy").mockResolvedValue(mockData);
            jest.spyOn(collector, "getObjectData").mockResolvedValue(mockData);
            mockObject = {
                addParentRelationship: jest.fn(),
                addSequenceRelationship: jest.fn(),
            };
            buildSpy = jest.spyOn(FedoraObject, "build").mockReturnValue(mockObject);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("will not make an object its own parent", async () => {
            const response = await request(app)
                .put(`/edit/object/${pid}/parent/${pid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.error.text).toEqual("Object cannot be its own parent.");
            expect(buildSpy).not.toHaveBeenCalled();
        });

        it("will not make an object its own grandparent", async () => {
            mockData.addParent(FedoraDataCollection.build(pid));
            const response = await request(app)
                .put(`/edit/object/${pid}/parent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.error.text).toEqual("Object cannot be its own grandparent.");
            expect(buildSpy).not.toHaveBeenCalled();
        });

        it("will not add a child to a non-collection object", async () => {
            const response = await request(app)
                .put(`/edit/object/${pid}/parent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.error.text).toEqual("Illegal parent foo:100; not a collection!");
            expect(buildSpy).not.toHaveBeenCalled();
        });

        it("adds parent when appropriate preconditions are met", async () => {
            jest.spyOn(mockData, "models", "get").mockReturnValue(["vudl-system:CollectionModel"]);
            await request(app)
                .put(`/edit/object/${pid}/parent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.OK);
            expect(buildSpy).toHaveBeenCalled();
            expect(mockObject.addParentRelationship).toHaveBeenCalledWith(parentPid);
            // no sequence because no custom sort
            expect(mockObject.addSequenceRelationship).not.toHaveBeenCalled();
        });

        it("adds parent and sequence when appropriate preconditions are met", async () => {
            jest.spyOn(mockData, "models", "get").mockReturnValue(["vudl-system:CollectionModel"]);
            jest.spyOn(mockData, "sortOn", "get").mockReturnValue("custom");
            await request(app)
                .put(`/edit/object/${pid}/parent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.OK);
            expect(buildSpy).toHaveBeenCalled();
            expect(mockObject.addParentRelationship).toHaveBeenCalledWith(parentPid);
            expect(mockObject.addSequenceRelationship).toHaveBeenCalledWith(parentPid, 2);
        });

        it("handles exceptions gracefully", async () => {
            const exception = new Error("kaboom");
            jest.spyOn(mockData, "models", "get").mockImplementation(() => {
                throw exception;
            });
            const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            const response = await request(app)
                .put(`/edit/object/${pid}/parent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
            expect(errorSpy).toHaveBeenCalledWith(exception);
            expect(response.error.text).toEqual("kaboom");
        });
    });

    describe("delete /object/:pid/parent/:parentPid", () => {
        let parentPid: string;
        let mockData: FedoraDataCollection;
        let deleteParentSpy;
        let deleteSequenceSpy;
        beforeEach(() => {
            parentPid = "foo:100";
            mockData = FedoraDataCollection.build(pid);
            const collector = FedoraDataCollector.getInstance();
            jest.spyOn(collector, "getHierarchy").mockResolvedValue(mockData);
            const fedora = Fedora.getInstance();
            deleteParentSpy = jest.spyOn(fedora, "deleteParentRelationship").mockImplementation(jest.fn());
            deleteSequenceSpy = jest.spyOn(fedora, "deleteSequenceRelationship").mockImplementation(jest.fn());
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("will reject an illegal parent/child pair", async () => {
            const response = await request(app)
                .delete(`/edit/object/${pid}/parent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.error.text).toEqual("foo:100 is not an immediate parent of foo:123.");
            expect(deleteParentSpy).not.toHaveBeenCalled();
            expect(deleteSequenceSpy).not.toHaveBeenCalled();
        });

        it("deletes parent only when appropriate preconditions are met", async () => {
            const parent = FedoraDataCollection.build(parentPid);
            mockData.addParent(parent);
            await request(app)
                .delete(`/edit/object/${pid}/parent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.OK);
            expect(deleteParentSpy).toHaveBeenCalledWith(pid, parentPid);
            // No custom sort = no sequence to delete
            expect(deleteSequenceSpy).not.toHaveBeenCalled();
        });

        it("deletes parent and sequence when appropriate preconditions are met", async () => {
            const parent = FedoraDataCollection.build(parentPid);
            parent.fedoraDetails.sortOn = ["custom"];
            mockData.addParent(parent);
            await request(app)
                .delete(`/edit/object/${pid}/parent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.OK);
            expect(deleteParentSpy).toHaveBeenCalledWith(pid, parentPid);
            expect(deleteSequenceSpy).toHaveBeenCalledWith(pid, parentPid);
        });
    });

    describe("delete /object/:pid/positionInParent/:parentPid", () => {
        let parentPid: string;
        let mockData: FedoraDataCollection;
        let sequenceSpy;
        beforeEach(() => {
            parentPid = "foo:100";
            mockData = FedoraDataCollection.build(pid);
            const collector = FedoraDataCollector.getInstance();
            jest.spyOn(collector, "getHierarchy").mockResolvedValue(mockData);
            const fedora = Fedora.getInstance();
            sequenceSpy = jest.spyOn(fedora, "deleteSequenceRelationship").mockImplementation(jest.fn());
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("will reject an illegal parent/child pair", async () => {
            const response = await request(app)
                .delete(`/edit/object/${pid}/positionInParent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send()
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.error.text).toEqual("foo:100 is not an immediate parent of foo:123.");
        });

        it("deletes sequence when appropriate preconditions are met", async () => {
            const parent = FedoraDataCollection.build(parentPid);
            parent.fedoraDetails.sortOn = ["custom"];
            mockData.addParent(parent);
            await request(app)
                .delete(`/edit/object/${pid}/positionInParent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send()
                .expect(StatusCodes.OK);
            expect(sequenceSpy).toHaveBeenCalledWith(pid, parentPid);
        });

        it("handles Fedora exceptions", async () => {
            const parent = FedoraDataCollection.build(parentPid);
            sequenceSpy.mockImplementation(() => {
                throw new Error("Kaboom");
            });
            parent.fedoraDetails.sortOn = ["custom"];
            mockData.addParent(parent);
            await request(app)
                .delete(`/edit/object/${pid}/positionInParent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send()
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
            expect(sequenceSpy).toHaveBeenCalledWith(pid, parentPid);
        });
    });

    describe("get /object/:pid/parents", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("will return deep hierarchy data by default", async () => {
            const data = FedoraDataCollection.build(pid);
            const hierarchySpy = jest.spyOn(FedoraDataCollector.getInstance(), "getHierarchy").mockResolvedValue(data);
            const response = await request(app)
                .get(`/edit/object/${pid}/parents`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(hierarchySpy).toHaveBeenCalledWith(pid, false);
            expect(response.body).toEqual({ parents: [], pid, title: "" });
        });

        it("will return shallow hierarchy data by request", async () => {
            const data = FedoraDataCollection.build(pid);
            const hierarchySpy = jest.spyOn(FedoraDataCollector.getInstance(), "getHierarchy").mockResolvedValue(data);
            const response = await request(app)
                .get(`/edit/object/${pid}/parents?shallow=1`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(hierarchySpy).toHaveBeenCalledWith(pid, true);
            expect(response.body).toEqual({ parents: [], pid, title: "" });
        });

        it("handles exceptions appropriately", async () => {
            const ex = new Error("kaboom");
            const hierarchySpy = jest
                .spyOn(FedoraDataCollector.getInstance(), "getHierarchy")
                .mockImplementation(() => {
                    throw ex;
                });
            const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());

            await request(app)
                .get(`/edit/object/${pid}/parents`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
            expect(hierarchySpy).toHaveBeenCalledWith(pid, false);
            expect(errorSpy).toHaveBeenCalledWith("Error retrieving breadcrumbs: " + ex);
        });
    });

    describe("put /object/:pid/positionInParent/:parentPid", () => {
        let parentPid: string;
        let mockData: FedoraDataCollection;
        let sequenceSpy;
        beforeEach(() => {
            parentPid = "foo:100";
            mockData = FedoraDataCollection.build(pid);
            const collector = FedoraDataCollector.getInstance();
            jest.spyOn(collector, "getHierarchy").mockResolvedValue(mockData);
            const fedora = Fedora.getInstance();
            sequenceSpy = jest.spyOn(fedora, "updateSequenceRelationship").mockImplementation(jest.fn());
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("will reject an illegal parent/child pair", async () => {
            const response = await request(app)
                .put(`/edit/object/${pid}/positionInParent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.error.text).toEqual("foo:100 is not an immediate parent of foo:123.");
        });

        it("will reject setting a position in an un-ordered parent", async () => {
            mockData.addParent(FedoraDataCollection.build(parentPid));
            const response = await request(app)
                .put(`/edit/object/${pid}/positionInParent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.BAD_REQUEST);
            expect(response.error.text).toEqual("foo:100 has sort value of title; custom is required.");
        });

        it("updates sequence when appropriate preconditions are met", async () => {
            const parent = FedoraDataCollection.build(parentPid);
            parent.fedoraDetails.sortOn = ["custom"];
            mockData.addParent(parent);
            await request(app)
                .put(`/edit/object/${pid}/positionInParent/${parentPid}`)
                .set("Authorization", "Bearer test")
                .set("Content-Type", "text/plain")
                .send("2")
                .expect(StatusCodes.OK);
            expect(sequenceSpy).toHaveBeenCalledWith(pid, parentPid, 2);
        });
    });

    describe("post /query/solr", () => {
        let querySpy;
        let solrResponse = {};
        beforeEach(() => {
            solrResponse = { statusCode: 200, body: { response: { foo: "bar" } } };
            querySpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue(solrResponse as NeedleResponse);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it("will return an empty response if no query is provided", async () => {
            const response = await request(app)
                .post(`/edit/query/solr`)
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(response.text).toEqual('{"numFound":0,"start":0,"docs":[]}');
        });
        it("will run an appropriate Solr query with default params", async () => {
            const response = await request(app)
                .post(`/edit/query/solr`)
                .send({ query: "foo" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledWith("biblio", "foo", {
                fl: "id,title",
                rows: "100",
                sort: "title_sort asc",
                start: "0",
            });
            expect(response.text).toEqual('{"foo":"bar"}');
        });
        it("allows sort, start and rows to be overridden", async () => {
            const response = await request(app)
                .post(`/edit/query/solr`)
                .send({ query: "foo", rows: 5, start: 3, sort: "title_sort desc" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.OK);
            expect(querySpy).toHaveBeenCalledWith("biblio", "foo", {
                fl: "id,title",
                rows: "5",
                sort: "title_sort desc",
                start: "3",
            });
            expect(response.text).toEqual('{"foo":"bar"}');
        });
        it("handles Solr errors", async () => {
            (solrResponse as Record<string, unknown>).statusCode = 500;
            const response = await request(app)
                .post(`/edit/query/solr`)
                .send({ query: "foo" })
                .set("Authorization", "Bearer test")
                .expect(StatusCodes.INTERNAL_SERVER_ERROR);
            expect(querySpy).toHaveBeenCalledWith("biblio", "foo", {
                fl: "id,title",
                rows: "100",
                sort: "title_sort asc",
                start: "0",
            });
            expect(response.text).toEqual("Unexpected Solr response code.");
        });
    });
});
