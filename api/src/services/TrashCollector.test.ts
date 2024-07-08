import Config from "../models/Config";
import Fedora from "./Fedora";
import FedoraDataCollector from "./FedoraDataCollector";
import { NeedleResponse } from "./interfaces";
import Solr from "./Solr";
import TrashCollector from "./TrashCollector";
import TrashTree from "../models/TrashTree";
import TrashTreeNode from "../models/TrashTreeNode";

describe("TrashCollector", () => {
    let collector;
    beforeEach(() => {
        Config.setInstance(new Config({ solr_core: "test_core" }));
        collector = TrashCollector.getInstance();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("pidIsSafeToPurge", () => {
        let getDataSpy;
        beforeEach(() => {
            getDataSpy = jest.spyOn(FedoraDataCollector.getInstance(), "getObjectData");
        });
        it("won't allow purging of active pids", async () => {
            getDataSpy.mockResolvedValue({ fedoraDetails: { state: ["Active"] } });
            expect(await collector.pidIsSafeToPurge("foo")).toEqual(false);
            expect(getDataSpy).toHaveBeenCalledTimes(1);
            expect(getDataSpy).toHaveBeenCalledWith("foo");
        });

        it("will allow purging of partially deleted pids", async () => {
            getDataSpy.mockImplementation(() => {
                throw new Error("Unexpected status code: 410");
            });
            expect(await collector.pidIsSafeToPurge("foo")).toEqual(true);
            expect(getDataSpy).toHaveBeenCalledTimes(1);
            expect(getDataSpy).toHaveBeenCalledWith("foo");
        });

        it("will rethrow unexpected exceptions", async () => {
            const error = new Error("Kerboom");
            getDataSpy.mockImplementation(() => {
                throw error;
            });
            let thrownError = null;
            try {
                await collector.pidIsSafeToPurge("foo");
            } catch (e) {
                thrownError = e;
            }
            expect(thrownError).toEqual(error);
        });

        it("will allow purging of deleted pids", async () => {
            getDataSpy.mockResolvedValue({ fedoraDetails: { state: ["Deleted"] } });
            expect(await collector.pidIsSafeToPurge("foo")).toEqual(true);
            expect(getDataSpy).toHaveBeenCalledTimes(1);
            expect(getDataSpy).toHaveBeenCalledWith("foo");
        });
    });

    describe("purgePid", () => {
        let deleteSpy;
        let deleteTombstoneSpy;
        let safeSpy;
        beforeEach(() => {
            const fedora = Fedora.getInstance();
            deleteSpy = jest.spyOn(fedora, "deleteObject").mockImplementation(jest.fn());
            deleteTombstoneSpy = jest.spyOn(fedora, "deleteObjectTombstone").mockImplementation(jest.fn());
            safeSpy = jest.spyOn(collector, "pidIsSafeToPurge");
        });

        it("returns false if PID is ineligible for purging", async () => {
            safeSpy.mockResolvedValue(false);
            expect(await collector.purgePid("foo")).toEqual(false);
            expect(safeSpy).toHaveBeenCalledTimes(1);
            expect(safeSpy).toHaveBeenCalledWith("foo");
            expect(deleteSpy).not.toHaveBeenCalled();
            expect(deleteTombstoneSpy).not.toHaveBeenCalled();
        });

        it("purges the object when eligible", async () => {
            safeSpy.mockResolvedValue(true);
            expect(await collector.purgePid("foo")).toEqual(true);
            expect(safeSpy).toHaveBeenCalledTimes(1);
            expect(safeSpy).toHaveBeenCalledWith("foo");
            expect(deleteSpy).toHaveBeenCalledTimes(1);
            expect(deleteSpy).toHaveBeenCalledWith("foo");
            expect(deleteTombstoneSpy).toHaveBeenCalledTimes(1);
            expect(deleteTombstoneSpy).toHaveBeenCalledWith("foo");
        });
    });

    describe("purgePids", () => {
        it("returns a list of failed/skipped PIDs", async () => {
            // Mock implementation will return false for pid 1, throw exception for pid 2 and succeed for all else,
            // in order to test all relevant code paths.
            const fakeError = new Error("Kerblooie!");
            const purgeSpy = jest.spyOn(collector, "purgePid").mockImplementation((pid) => {
                if (pid === "pid:2") {
                    throw fakeError;
                }
                return pid !== "pid:1";
            });
            const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            const skippedList = await collector.purgePids(["pid:1", "pid:2", "pid:3"]);
            expect(skippedList).toEqual(["pid:1", "pid:2"]);
            expect(purgeSpy).toHaveBeenCalledTimes(3);
            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(errorSpy).toHaveBeenCalledWith(fakeError);
        });
    });

    describe("pidHasChildren", () => {
        it("finds children when they exist", async () => {
            const solrSpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue({
                statusCode: 200,
                body: {
                    response: {
                        numFound: 2,
                        docs: [{ id: "foo" }, { id: "bar" }],
                    },
                },
            } as NeedleResponse);
            expect(await collector.pidHasChildren("root")).toEqual(true);
            expect(solrSpy).toHaveBeenCalledWith("test_core", 'hierarchy_all_parents_str_mv:"root"', {
                fl: "id",
                rows: "100000",
            });
        });

        it("returns false when there are no children", async () => {
            const solrSpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue({
                statusCode: 200,
                body: {
                    response: {
                        numFound: 0,
                        docs: [],
                    },
                },
            } as NeedleResponse);
            expect(await collector.pidHasChildren("root")).toEqual(false);
            expect(solrSpy).toHaveBeenCalledWith("test_core", 'hierarchy_all_parents_str_mv:"root"', {
                fl: "id",
                rows: "100000",
            });
        });

        it("reports a problem when there are too many children", async () => {
            const solrSpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue({
                statusCode: 200,
                body: {
                    response: {
                        numFound: 1000000000,
                        docs: [{ id: "foo" }, { id: "bar" }],
                    },
                },
            } as NeedleResponse);
            let message = "";
            try {
                await collector.pidHasChildren("root");
            } catch (e) {
                message = e.message;
            }
            expect(message).toEqual("root has too many children to analyze.");
            expect(solrSpy).toHaveBeenCalledWith("test_core", 'hierarchy_all_parents_str_mv:"root"', {
                fl: "id",
                rows: "100000",
            });
        });

        it("responds to Solr errors appropriately", async () => {
            const solrSpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue({
                statusCode: 500,
            } as NeedleResponse);
            let message = "";
            try {
                await collector.pidHasChildren("root");
            } catch (e) {
                message = e.message;
            }
            expect(message).toEqual("Unexpected problem communicating with Solr.");
            expect(solrSpy).toHaveBeenCalledWith("test_core", 'hierarchy_all_parents_str_mv:"root"', {
                fl: "id",
                rows: "100000",
            });
        });

        it("filters unwanted PIDs from the child list", async () => {
            const solrSpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue({
                statusCode: 200,
                body: {
                    response: {
                        numFound: 2,
                        docs: [{ id: "foo" }, { id: "bar" }],
                    },
                },
            } as NeedleResponse);
            expect(await collector.pidHasChildren("root", ["foo", "bar"])).toEqual(false);
            expect(solrSpy).toHaveBeenCalledWith("test_core", 'hierarchy_all_parents_str_mv:"root"', {
                fl: "id",
                rows: "100000",
            });
        });
    });

    describe("getTrashTreeForPid", () => {
        it("maps a Solr response into a trash tree", async () => {
            const solrSpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue({
                statusCode: 200,
                body: {
                    response: {
                        numFound: 2,
                        docs: [
                            { id: "foo", fedora_parent_id_str_mv: ["root"] },
                            { id: "bar", fedora_parent_id_str_mv: ["foo"] },
                        ],
                    },
                },
            } as NeedleResponse);
            const tree = await collector.getTrashTreeForPid("root");
            const firstLeaf = tree.getNextLeaf();
            expect(firstLeaf.pid).toEqual("bar");
            tree.removeLeafNode(firstLeaf);
            const secondLeaf = tree.getNextLeaf();
            expect(secondLeaf.pid).toEqual("foo");
            tree.removeLeafNode(secondLeaf);
            expect(tree.getNextLeaf()).toEqual(null);
            expect(solrSpy).toHaveBeenCalledWith(
                "test_core",
                'hierarchy_all_parents_str_mv:"root" AND fgs.state_txt_mv:"Deleted"',
                {
                    fl: "id,fedora_parent_id_str_mv",
                    start: "0",
                    rows: "100000",
                },
            );
        });

        it("handles an empty Solr response correctly", async () => {
            const solrSpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue({
                statusCode: 200,
                body: {
                    response: {
                        numFound: 0,
                        docs: [],
                    },
                },
            } as NeedleResponse);
            const tree = await collector.getTrashTreeForPid("root");
            expect(tree.getNextLeaf()).toEqual(null);
            expect(solrSpy).toHaveBeenCalledWith(
                "test_core",
                'hierarchy_all_parents_str_mv:"root" AND fgs.state_txt_mv:"Deleted"',
                {
                    fl: "id,fedora_parent_id_str_mv",
                    start: "0",
                    rows: "100000",
                },
            );
        });

        it("paginates Solr results when necessary", async () => {
            const solrSpy = jest
                .spyOn(Solr.getInstance(), "query")
                .mockResolvedValueOnce({
                    statusCode: 200,
                    body: {
                        response: {
                            numFound: 2,
                            docs: [{ id: "bar", fedora_parent_id_str_mv: ["foo"] }],
                        },
                    },
                } as NeedleResponse)
                .mockResolvedValueOnce({
                    statusCode: 200,
                    body: {
                        response: {
                            numFound: 2,
                            docs: [{ id: "foo", fedora_parent_id_str_mv: ["root"] }],
                        },
                    },
                } as NeedleResponse);
            const tree = await collector.getTrashTreeForPid("root", 1);
            const firstLeaf = tree.getNextLeaf();
            expect(firstLeaf.pid).toEqual("bar");
            tree.removeLeafNode(firstLeaf);
            const secondLeaf = tree.getNextLeaf();
            expect(secondLeaf.pid).toEqual("foo");
            tree.removeLeafNode(secondLeaf);
            expect(tree.getNextLeaf()).toEqual(null);
            expect(solrSpy).toHaveBeenCalledWith(
                "test_core",
                'hierarchy_all_parents_str_mv:"root" AND fgs.state_txt_mv:"Deleted"',
                {
                    fl: "id,fedora_parent_id_str_mv",
                    start: "0",
                    rows: "1",
                },
            );
            expect(solrSpy).toHaveBeenCalledWith(
                "test_core",
                'hierarchy_all_parents_str_mv:"root" AND fgs.state_txt_mv:"Deleted"',
                {
                    fl: "id,fedora_parent_id_str_mv",
                    start: "1",
                    rows: "1",
                },
            );
            expect(solrSpy).toHaveBeenCalledTimes(2);
        });

        it("responds to Solr errors appropriately", async () => {
            const solrSpy = jest.spyOn(Solr.getInstance(), "query").mockResolvedValue({
                statusCode: 500,
            } as NeedleResponse);
            let message = "";
            try {
                await collector.getTrashTreeForPid("root");
            } catch (e) {
                message = e.message;
            }
            expect(message).toEqual("Unexpected problem communicating with Solr.");
            expect(solrSpy).toHaveBeenCalledWith(
                "test_core",
                'hierarchy_all_parents_str_mv:"root" AND fgs.state_txt_mv:"Deleted"',
                {
                    fl: "id,fedora_parent_id_str_mv",
                    start: "0",
                    rows: "100000",
                },
            );
        });
    });

    describe("purgeDeletedPidsInContainer", () => {
        let errorSpy;
        let logSpy;

        beforeEach(() => {
            errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            logSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
        });

        it("purges nodes in the right order", async () => {
            const tree = new TrashTree("root");
            tree.addNode(new TrashTreeNode("foo", ["bar"]));
            tree.addNode(new TrashTreeNode("bar", ["root"]));
            jest.spyOn(collector, "getTrashTreeForPid").mockResolvedValue(tree);
            const safeSpy = jest.spyOn(collector, "pidIsSafeToPurge").mockResolvedValue(true);
            const childrenSpy = jest.spyOn(collector, "pidHasChildren").mockResolvedValue(false);
            const purgeSpy = jest.spyOn(collector, "purgePid").mockImplementation(jest.fn());
            await collector.purgeDeletedPidsInContainer("root");
            expect(errorSpy).not.toHaveBeenCalled();
            expect(logSpy).toHaveBeenNthCalledWith(1, "Purged foo");
            expect(logSpy).toHaveBeenNthCalledWith(2, "Purged bar");
            expect(logSpy).toHaveBeenCalledTimes(2);
            expect(safeSpy).toHaveBeenCalledTimes(2);
            expect(childrenSpy).toHaveBeenCalledTimes(2);
            expect(purgeSpy).toHaveBeenCalledTimes(2);
        });

        it("reports an empty tree", async () => {
            const tree = new TrashTree("root");
            jest.spyOn(collector, "getTrashTreeForPid").mockResolvedValue(tree);
            jest.spyOn(collector, "pidIsSafeToPurge").mockResolvedValue(true);
            jest.spyOn(collector, "pidHasChildren").mockResolvedValue(false);
            const purgeSpy = jest.spyOn(collector, "purgePid").mockImplementation(jest.fn());
            await collector.purgeDeletedPidsInContainer("root");
            expect(errorSpy).not.toHaveBeenCalled();
            expect(purgeSpy).not.toHaveBeenCalled();
            expect(logSpy).toHaveBeenNthCalledWith(1, "Nothing found to delete.");
            expect(logSpy).toHaveBeenCalledTimes(1);
        });

        it("reports purge exceptions", async () => {
            const kaboom = new Error("kaboom!");
            const tree = new TrashTree("root");
            tree.addNode(new TrashTreeNode("bar", ["root"]));
            jest.spyOn(collector, "getTrashTreeForPid").mockResolvedValue(tree);
            jest.spyOn(collector, "pidIsSafeToPurge").mockResolvedValue(true);
            jest.spyOn(collector, "pidHasChildren").mockResolvedValue(false);
            const purgeSpy = jest.spyOn(collector, "purgePid").mockImplementation(() => {
                throw kaboom;
            });
            await collector.purgeDeletedPidsInContainer("root");
            expect(logSpy).not.toHaveBeenCalled();
            expect(purgeSpy).toHaveBeenCalledWith("bar");
            expect(errorSpy).toHaveBeenNthCalledWith(1, "Problem purging bar -- ", kaboom);
            expect(errorSpy).toHaveBeenCalledTimes(1);
        });

        it("reports unsafe PIDs", async () => {
            const tree = new TrashTree("root");
            tree.addNode(new TrashTreeNode("bar", ["root"]));
            jest.spyOn(collector, "getTrashTreeForPid").mockResolvedValue(tree);
            jest.spyOn(collector, "pidIsSafeToPurge").mockResolvedValue(false);
            jest.spyOn(collector, "pidHasChildren").mockResolvedValue(false);
            const purgeSpy = jest.spyOn(collector, "purgePid").mockImplementation(jest.fn());
            await collector.purgeDeletedPidsInContainer("root");
            expect(logSpy).not.toHaveBeenCalled();
            expect(purgeSpy).not.toHaveBeenCalled();
            expect(errorSpy).toHaveBeenNthCalledWith(1, "bar is not safe to purge!");
            expect(errorSpy).toHaveBeenCalledTimes(1);
        });

        it("reports unexpected children", async () => {
            const tree = new TrashTree("root");
            tree.addNode(new TrashTreeNode("bar", ["root"]));
            jest.spyOn(collector, "getTrashTreeForPid").mockResolvedValue(tree);
            jest.spyOn(collector, "pidIsSafeToPurge").mockResolvedValue(true);
            jest.spyOn(collector, "pidHasChildren").mockResolvedValue(true);
            const purgeSpy = jest.spyOn(collector, "purgePid").mockImplementation(jest.fn());
            await collector.purgeDeletedPidsInContainer("root");
            expect(logSpy).not.toHaveBeenCalled();
            expect(purgeSpy).not.toHaveBeenCalled();
            expect(errorSpy).toHaveBeenNthCalledWith(1, "bar has unexpected children!");
            expect(errorSpy).toHaveBeenCalledTimes(1);
        });

        it("detects orphaned nodes", async () => {
            const tree = new TrashTree("root");
            tree.addNode(new TrashTreeNode("foo", ["bar"]));
            jest.spyOn(collector, "getTrashTreeForPid").mockResolvedValue(tree);
            await collector.purgeDeletedPidsInContainer("root");
            expect(errorSpy).toHaveBeenCalledWith("Unexpected orphaned nodes found: foo");
        });

        it("handles tree exceptions appropriately", async () => {
            const kaboom = new Error("kaboom");
            jest.spyOn(collector, "getTrashTreeForPid").mockImplementation(() => {
                throw kaboom;
            });
            await collector.purgeDeletedPidsInContainer("foo");
            expect(errorSpy).toHaveBeenCalledWith(kaboom);
        });
    });
});
