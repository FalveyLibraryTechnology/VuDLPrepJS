import Config from "../models/Config";
import Solr from "./Solr";
import FedoraCatalog from "./FedoraCatalog";

describe("FedoraCatalog", () => {
    describe("getCompleteCatalog", () => {
        let config;
        let solr;
        let solrResponse;
        let core;
        let query;
        let solrParams;

        beforeEach(() => {
            config = new Config({ favorite_pids: ["foo:123", "foo:124"], trash_pid: "foo:999" });
            solr = {
                query: jest.fn(),
            };
            solrResponse = {};
            solr.query.mockImplementation((c, q, sP) => {
                core = c;
                query = q;
                solrParams = sP;
                return solrResponse;
            });
            jest.spyOn(Config, "getInstance").mockImplementation(() => config);
            jest.spyOn(Solr, "getInstance").mockReturnValue(solr);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it("returns a catalog with appropriate agent information", async () => {
            config = new Config({
                agent: { roles: ["A", "B"], types: ["C", "D"], defaults: { name: "E", role: "A", type: "C" } },
            });
            const expectedCatalog = {
                agents: {
                    defaults: { name: "E", role: "A", type: "C" },
                    roles: ["A", "B"],
                    types: ["C", "D"],
                },
                dublinCoreFields: {},
                favoritePids: {},
                trashPid: null,
                licenses: {},
                models: {},
                processMetadataDefaults: {},
                topLevelPids: [],
                toolPresets: [],
                vufindUrl: "",
            };
            expect(await FedoraCatalog.getInstance().getCompleteCatalog()).toEqual(expectedCatalog);
        });

        it("returns a catalog based on the configuration, tolerating empty Solr PIDS response", async () => {
            const expectedCatalog = {
                agents: {
                    defaults: {},
                    roles: [],
                    types: [],
                },
                dublinCoreFields: {},
                favoritePids: {
                    "foo:123": "foo:123",
                    "foo:124": "foo:124",
                    "foo:999": "foo:999",
                },
                trashPid: "foo:999",
                licenses: {},
                models: {},
                processMetadataDefaults: {},
                topLevelPids: [],
                toolPresets: [],
                vufindUrl: "",
            };
            const catalog = new FedoraCatalog(config, solr);
            expect(await catalog.getCompleteCatalog()).toEqual(expectedCatalog);
        });

        it("returns a catalog based on the configuration, utilizing non-empty Solr PIDS response", async () => {
            solrResponse = {
                body: {
                    response: {
                        docs: [
                            { id: "foo:123" },
                            { id: "foo:124", title: "second title" },
                            { id: "foo:999", title: "Trash" },
                        ],
                    },
                },
            };
            const expectedCatalog = {
                agents: {
                    defaults: {},
                    roles: [],
                    types: [],
                },
                dublinCoreFields: {},
                favoritePids: {
                    "foo:123": "- [foo:123]", // test missing title in Solr response
                    "foo:124": "second title [foo:124]",
                    "foo:999": "Trash [foo:999]",
                },
                trashPid: "foo:999",
                licenses: {},
                models: {},
                processMetadataDefaults: {},
                topLevelPids: [],
                toolPresets: [],
                vufindUrl: "",
            };
            const catalog = new FedoraCatalog(config, solr);
            expect(await catalog.getCompleteCatalog()).toEqual(expectedCatalog);
            expect(core).toEqual("biblio");
            expect(query).toEqual('id:"foo:123" OR id:"foo:124" OR id:"foo:999"');
            expect(solrParams).toEqual({ fl: "id,title", rows: "3" });
        });
    });
});
