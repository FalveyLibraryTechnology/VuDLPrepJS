import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, act, waitFor } from "@testing-library/react";
import { EditorContextProvider, useEditorContext } from "./EditorContext";

const mockUseFetchContext = jest.fn();
jest.mock("./FetchContext", () => ({
    useFetchContext: () => {
        return mockUseFetchContext();
    },
}));

describe("useEditorContext", () => {
    let fetchValues: Record<string, Record<string, () => unknown>>;
    beforeEach(() => {
        fetchValues =  {
            action: {
                fetchJSON: jest.fn(),
                fetchText: jest.fn(),
            }
        };
        mockUseFetchContext.mockReturnValue(
            fetchValues
        );
    });

    afterEach(() => {
        jest.resetAllMocks();
    });
    describe("setCurrentAgents", () => {
        it("sets the current agents", async () => {
            const agents = [{ role: "test1", type: "test2", name: "test3", notes: [ "test4" ]}];
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            expect(result.current.state.currentAgents).toHaveLength(0);

            await act(async () => {
                await result.current.action.setCurrentAgents(agents);
            });

            expect(result.current.state.currentAgents).toEqual(agents);
        });
    });
    describe("setCurrentPid", () => {
        it("sets the current pid", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            expect(result.current.state.currentPid).toBeNull();

            await act(async () => {
                await result.current.action.setCurrentPid("test1");
            });

            expect(result.current.state.currentPid).toEqual("test1");
        });
    });

    describe("setDatastreamModalState", () => {
        it("sets the modal state", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            expect(result.current.state.datastreamModalState).toBeNull();

            await act(async () => {
                await result.current.action.setDatastreamModalState("test1");
            });

            expect(result.current.state.datastreamModalState).toEqual("test1");
        });
    });

    describe("setParentsModalActivePid", () => {
        it("sets the active PID", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            expect(result.current.state.parentsModalActivePid).toBeNull();

            await act(async () => {
                await result.current.action.setParentsModalActivePid("test1");
            });

            expect(result.current.state.parentsModalActivePid).toEqual("test1");
        });
    });

    describe("setActiveDatastream", () => {
        it("sets the active datastream", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            expect(result.current.state.activeDatastream).toBeNull();

            await act(async () => {
                await result.current.action.setActiveDatastream("test1");
            });

            expect(result.current.state.activeDatastream).toEqual("test1");
        });
    });

    describe("initializeCatalog", () => {
        it("initializes the catalog with data", async () => {
            // Note: this data is not realistic!
            const models = { CoreModel: "test1" };
            const licenses = { license: "data" };
            const favoritePids = { pid: "foo" };
            const agents = { agent: "bar" };
            const dublinCoreFields = { field: "xyzzy" };
            fetchValues.action.fetchJSON.mockResolvedValue({ models, licenses, favoritePids, agents, dublinCoreFields });
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            await act(async () => {
                await result.current.action.initializeCatalog();
            });

            expect(fetchValues.action.fetchJSON).toHaveBeenCalled();
            expect(result.current.state.modelsCatalog).toEqual(models);
            expect(result.current.state.licensesCatalog).toEqual(licenses);
            expect(result.current.state.favoritePidsCatalog).toEqual(favoritePids);
            expect(result.current.state.agentsCatalog).toEqual(agents);
            expect(result.current.state.dublinCoreFieldCatalog).toEqual(dublinCoreFields);
        });

        it("initializes the catalog with defaults", async () => {
            fetchValues.action.fetchJSON.mockResolvedValue({});
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            await act(async () => {
                await result.current.action.initializeCatalog();
            });

            expect(fetchValues.action.fetchJSON).toHaveBeenCalled();
            expect(result.current.state.modelsCatalog).toEqual({});
            expect(result.current.state.licensesCatalog).toEqual({});
            expect(result.current.state.favoritePidsCatalog).toEqual({});
            expect(result.current.state.agentsCatalog).toEqual({});
            expect(result.current.state.dublinCoreFieldCatalog).toEqual({});
        });

        it("throws an error", async () => {
            const errorSpy = jest.spyOn(global.console, "error").mockImplementation(jest.fn());
            fetchValues.action.fetchJSON.mockRejectedValue("test1");
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            await act(async () => {
                await result.current.action.initializeCatalog();
            });

            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Problem fetching object catalog"));
        });
    });

    describe("loadCurrentObjectDetails", () => {
        it("calls the current object details request", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            expect(result.current.state.modelsDatastreams.length).toBe(0);

            act(() => {
                result.current.action.setCurrentPid("test1");
            });

            fetchValues.action.fetchJSON.mockResolvedValueOnce({
                models: {
                    CoreModel: {
                        datastreams: {
                            THUMBNAIL: {
                                allowedType: "image",
                                allowedSubtypes: "jpeg,gif,png"
                            }
                        }
                    }
                }
            });

            await act(async () => {
                await result.current.action.initializeCatalog();
            });

            fetchValues.action.fetchJSON.mockResolvedValueOnce({
                models: [
                    "vudl-system:CoreModel"
                ]
            });

            await act(async () => {
                await result.current.action.loadCurrentObjectDetails();
            });

            expect(fetchValues.action.fetchJSON).toHaveBeenCalled();
            expect(result.current.state.modelsDatastreams.length).toBe(1);
        });

        it("handles errors", async () => {
            const errorSpy = jest.spyOn(global.console, "error").mockImplementation(jest.fn());
            const errorCallback = jest.fn();
            fetchValues.action.fetchJSON.mockRejectedValue("test1");
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            act(() => {
                result.current.action.setCurrentPid("test1");
            });

            await act(async () => {
                await result.current.action.loadCurrentObjectDetails(errorCallback);
            });

            expect(errorCallback).toHaveBeenCalledWith("test1");
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Problem fetching details"));
        });
    });

    describe("extractFirstMetadataValue", () => {
        it("returns a default value if no matching field is found", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            expect(result.current.action.extractFirstMetadataValue("field", "default")).toEqual("default");
        });

        it("extracts the first value when a matching field is found", async () => {
            fetchValues.action.fetchJSON.mockResolvedValue({
                metadata: {
                    field: ["foo", "bar"],
                },
            });
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            await act(async () => {
                await result.current.action.setCurrentPid("test:123");
            });
            await result.current.action.loadCurrentObjectDetails();
            await waitFor(() => expect(fetchValues.action.fetchJSON).toHaveBeenCalled());
            expect(result.current.action.extractFirstMetadataValue("field", "default")).toEqual("foo");
        });
    });

    describe("getChildListStorageKey", () => {
        it("generates appropriate keys", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            expect(result.current.action.getChildListStorageKey("test:123", 1, 10)).toEqual("test:123_1_10");
        });
    });

    describe("loadObjectDetailsIntoStorage", () => {
        it("successfully calls fetch", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            expect(Object.keys(result.current.state.objectDetailsStorage)).toEqual([]);
            await act(async () => {
                await result.current.action.loadObjectDetailsIntoStorage("test:123");
            });
            expect(Object.keys(result.current.state.objectDetailsStorage)).toEqual(["test:123"]);
            expect(fetchValues.action.fetchJSON).toHaveBeenCalledTimes(1);
            expect(fetchValues.action.fetchJSON).toHaveBeenCalledWith("http://localhost:9000/api/edit/object/test%3A123/details");
        });

        it("ignores null pids", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            expect(Object.keys(result.current.state.objectDetailsStorage)).toEqual([]);
            await act(async () => {
                await result.current.action.loadObjectDetailsIntoStorage(null);
            });
            expect(Object.keys(result.current.state.objectDetailsStorage)).toEqual([]);
            expect(fetchValues.action.fetchJSON).toHaveBeenCalledTimes(0);
        });

        it("handles exceptions", async () => {
            const fetchSpy = jest.spyOn(fetchValues.action, "fetchJSON").mockImplementation(() => { throw new Error("kaboom"); });
            const consoleSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            await act(async () => {
                await result.current.action.loadObjectDetailsIntoStorage("test:123");
            });
            expect(fetchSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith("Problem fetching details from http://localhost:9000/api/edit/object/test%3A123/details");
        });
    });

    describe("removeFromObjectDetailsStorage", () => {
        it("removes the specified record without impacting others", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            expect(Object.keys(result.current.state.objectDetailsStorage)).toEqual([]);
            await act(async () => {
                await result.current.action.loadObjectDetailsIntoStorage("test:123");
                await result.current.action.loadObjectDetailsIntoStorage("test:124");
                await result.current.action.loadObjectDetailsIntoStorage("test:125");
            });
            expect(Object.keys(result.current.state.objectDetailsStorage)).toEqual(["test:123", "test:124", "test:125"]);
            await act(async () => {
                await result.current.action.removeFromObjectDetailsStorage("test:124");
            });
            expect(Object.keys(result.current.state.objectDetailsStorage)).toEqual(["test:123", "test:125"]);
        });
    });

    describe("loadChildCountsIntoStorage", () => {
        it("successfully calls fetch", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            expect(Object.keys(result.current.state.childCountsStorage)).toEqual([]);
            await act(async () => {
                await result.current.action.loadChildCountsIntoStorage("test:123");
            });
            expect(Object.keys(result.current.state.childCountsStorage)).toEqual(["test:123"]);
            expect(fetchValues.action.fetchJSON).toHaveBeenCalledTimes(1);
            expect(fetchValues.action.fetchJSON).toHaveBeenCalledWith("http://localhost:9000/api/edit/object/test%3A123/childCounts");
        });

        it("handles exceptions", async () => {
            const fetchSpy = jest.spyOn(fetchValues.action, "fetchJSON").mockImplementation(() => { throw new Error("kaboom"); });
            const consoleSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            await act(async () => {
                await result.current.action.loadChildCountsIntoStorage("test:123");
            });
            expect(fetchSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith("Problem fetching child count data from http://localhost:9000/api/edit/object/test%3A123/childCounts");
        });
    });

    describe("loadChildrenIntoStorage", () => {
        it("successfully calls fetch", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            expect(Object.keys(result.current.state.childListStorage)).toEqual([]);
            await act(async () => {
                await result.current.action.loadChildrenIntoStorage("test:123", 1, 10);
            });
            expect(Object.keys(result.current.state.childListStorage)).toEqual(["test:123_1_10"]);
            expect(fetchValues.action.fetchJSON).toHaveBeenCalledTimes(1);
            expect(fetchValues.action.fetchJSON).toHaveBeenCalledWith("http://localhost:9000/api/edit/object/test%3A123/children?start=0&rows=10");
        });

        it("handles exceptions", async () => {
            const fetchSpy = jest.spyOn(fetchValues.action, "fetchJSON").mockImplementation(() => { throw new Error("kaboom"); });
            const consoleSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            await act(async () => {
                await result.current.action.loadChildrenIntoStorage("test:123", 1, 10);
            });
            expect(fetchSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith("Problem fetching tree data from http://localhost:9000/api/edit/object/test%3A123/children?start=0&rows=10");
        });
    });

    describe("clearPidFromChildListStorage", () => {
        it("removes all pages of appropriate data", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            expect(Object.keys(result.current.state.childListStorage)).toEqual([]);
            await act(async () => {
                await result.current.action.loadChildrenIntoStorage("test:123", 1, 10);
                await result.current.action.loadChildrenIntoStorage("test:123", 11, 10);
                await result.current.action.loadChildrenIntoStorage("test:1234", 1, 10);
            });
            expect(Object.keys(result.current.state.childListStorage)).toEqual(["test:123_1_10", "test:123_11_10", "test:1234_1_10"]);
            await act(async () => {
                await result.current.action.clearPidFromChildListStorage("test:123");
            });
            expect(Object.keys(result.current.state.childListStorage)).toEqual(["test:1234_1_10"]);
        });
    });

    describe("clearPidFromChildCountsStorage", () => {
        it("removes all pages of appropriate data", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            expect(Object.keys(result.current.state.childCountsStorage)).toEqual([]);
            await act(async () => {
                await result.current.action.loadChildCountsIntoStorage("test:123");
                await result.current.action.loadChildCountsIntoStorage("test:124");
            });
            expect(Object.keys(result.current.state.childCountsStorage)).toEqual(["test:123", "test:124"]);
            await act(async () => {
                await result.current.action.clearPidFromChildCountsStorage("test:123");
            });
            expect(Object.keys(result.current.state.childCountsStorage)).toEqual(["test:124"]);
        });
    });

    describe("setStateModalActivePid", () => {
        it("sets the modal's active pid value", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            expect(result.current.state.stateModalActivePid).toBeNull();

            await act(async () => {
                await result.current.action.setStateModalActivePid("test:1");
            });

            expect(result.current.state.stateModalActivePid).toEqual("test:1");
        });
    });

    describe("loadParentDetailsIntoStorage", () => {
        it("ignores null PIDs", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            expect(Object.keys(result.current.state.parentDetailsStorage)).toEqual([]);
            await act(async () => {
                await result.current.action.loadParentDetailsIntoStorage("test:123");
                await result.current.action.loadParentDetailsIntoStorage(null);
                await result.current.action.loadParentDetailsIntoStorage("test:125");
            });
            expect(Object.keys(result.current.state.parentDetailsStorage)).toEqual(["test:123", "test:125"]);
        });

        it("handles errors", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            const callback = jest.fn();
            const errorSpy = jest.spyOn(global.console, "error").mockImplementation(jest.fn());
            fetchValues.action.fetchJSON.mockRejectedValue("test1");
            await act(async () => {
                await result.current.action.loadParentDetailsIntoStorage("test:123", false, callback);
            });
            expect(callback).toHaveBeenCalledWith("test:123");
            expect(errorSpy).toHaveBeenCalledWith("Problem fetching parent details from http://localhost:9000/api/edit/object/test%3A123/parents");
        });
    });

    describe("removeFromParentDetailsStorage", () => {
        it("removes the specified record without impacting others", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            expect(Object.keys(result.current.state.parentDetailsStorage)).toEqual([]);
            await act(async () => {
                await result.current.action.loadParentDetailsIntoStorage("test:123");
                await result.current.action.loadParentDetailsIntoStorage("test:124");
                await result.current.action.loadParentDetailsIntoStorage("test:125");
            });
            expect(Object.keys(result.current.state.parentDetailsStorage)).toEqual(["test:123", "test:124", "test:125"]);
            await act(async () => {
                await result.current.action.removeFromParentDetailsStorage("test:124");
            });
            expect(Object.keys(result.current.state.parentDetailsStorage)).toEqual(["test:123", "test:125"]);
        });
    });

    describe("updateObjectState", () => {
        const pid = "test:123";

        it("saves data correctly", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            // Load an object into storage so we can test that it gets cleared out after updates:
            const fakeObjectDetails = { foo: "bar" };
            fetchValues.action.fetchJSON.mockResolvedValue(fakeObjectDetails);
            await act(async() => {
                await result.current.action.loadObjectDetailsIntoStorage(pid);
            });
            expect(result.current.state.objectDetailsStorage[pid]).toEqual(fakeObjectDetails);
            const statusCallback = jest.fn();
            fetchValues.action.fetchText.mockResolvedValue("ok");
            let updateResult;
            await act(async () => {
                updateResult = await result.current.action.updateObjectState(pid, "Active", 0, statusCallback);
            });
            expect(statusCallback).toHaveBeenCalledWith("Saving status for test:123 (0 more remaining)...");
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith("http://localhost:9000/api/edit/object/test%3A123/state", {"body": "Active", "method": "PUT"});
            expect(updateResult).toEqual(["Status saved successfully.", "success"]);
            // Object storage should now be empty due to clearing of changed data:
            expect(result.current.state.objectDetailsStorage).toEqual({});
        });

        it("handles save failure gracefully", async () => {
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            const statusCallback = jest.fn();
            fetchValues.action.fetchText.mockResolvedValue("not ok");
            let updateResult;
            await act(async () => {
                updateResult = await result.current.action.updateObjectState(pid, "Active", 0, statusCallback);
            });
            expect(statusCallback).toHaveBeenCalledWith("Saving status for test:123 (0 more remaining)...");
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith("http://localhost:9000/api/edit/object/test%3A123/state", {"body": "Active", "method": "PUT"});
            expect(updateResult).toEqual(["Status failed to save; \"not ok\"", "error"]);
        });

        it("handles child save failure gracefully", async () => {
            fetchValues.action.fetchJSON.mockResolvedValue({ numFound: 1, docs: [{ id: "foo:125" }] });
            fetchValues.action.fetchText.mockResolvedValue("not ok");
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            const statusCallback = jest.fn();
            fetchValues.action.fetchText.mockResolvedValue("not ok");
            let updateResult;
            await act(async () => {
                try {
                    await result.current.action.updateObjectState(pid, "Active", 1, statusCallback);
                } catch (e) {
                    updateResult = e;
                }
            });
            expect(statusCallback).toHaveBeenCalledTimes(1);
            expect(statusCallback).toHaveBeenCalledWith("Saving status for foo:125 (1 more remaining)...");
            expect(updateResult.message).toEqual("Status failed to save; \"not ok\"");
        });

        it("updates children correctly", async () => {
            fetchValues.action.fetchJSON.mockResolvedValue({ numFound: 1, docs: [{ id: "foo:125" }] });
            fetchValues.action.fetchText.mockResolvedValue("ok");
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            const statusCallback = jest.fn();
            let updateResult;
            await act(async () => {
                updateResult = await result.current.action.updateObjectState(pid, "Active", 1, statusCallback);
            });
            expect(statusCallback).toHaveBeenCalledTimes(2);
            expect(statusCallback).toHaveBeenCalledWith("Saving status for foo:125 (1 more remaining)...");
            expect(statusCallback).toHaveBeenCalledWith("Saving status for test:123 (0 more remaining)...");
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith("http://localhost:9000/api/edit/object/test%3A123/state", {"body": "Active", "method": "PUT"});
            expect(updateResult).toEqual(["Status saved successfully.", "success"]);
            // Object storage should now be empty due to clearing of changed data:
            expect(result.current.state.objectDetailsStorage).toEqual({});
        });
    });

    describe("attachObjectToParent", () => {
        const pid = "foo:123";

        it("attaches parents successfully", async () => {
            fetchValues.action.fetchText.mockResolvedValue("ok");
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            // Load data into storage so we can test that it gets cleared out after updates:
            const fakeObjectDetails = { foo: "bar" };
            fetchValues.action.fetchJSON.mockResolvedValue(fakeObjectDetails);
            await act(async() => {
                await result.current.action.loadObjectDetailsIntoStorage(pid);
            });
            expect(result.current.state.objectDetailsStorage[pid]).toEqual(fakeObjectDetails);
            const fakeParentDetails = ["foo", "bar"];
            fetchValues.action.fetchJSON.mockResolvedValue(fakeParentDetails);
            await act(async() => {
                await result.current.action.loadParentDetailsIntoStorage(pid);
            });
            expect(result.current.state.parentDetailsStorage[pid]["full"]).toEqual(fakeParentDetails);
            const fakeChildPage = ["boop"];
            fetchValues.action.fetchJSON.mockResolvedValue(fakeChildPage);
            await act(async() => {
                await result.current.action.loadChildrenIntoStorage("foo:122", 1, 1);
            });
            const expectedKey = result.current.action.getChildListStorageKey("foo:122", 1, 1);
            expect(result.current.state.childListStorage[expectedKey]).toEqual(fakeChildPage);

            // Now run the actual test:
            let updateResult;
            await act(async () => {
                updateResult = await result.current.action.attachObjectToParent(pid, "foo:122", "");
            });
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A123/parent/foo%3A122",
                { method: "PUT", body: "" },
            );
            expect(updateResult).toEqual("ok");

            // Various caches should now be empty due to clearing of changed data:
            expect(result.current.state.objectDetailsStorage).toEqual({});
            expect(result.current.state.parentDetailsStorage).toEqual({});
            expect(result.current.state.childListStorage).toEqual({});
        });

        it("handles exceptions on fetchText call", async () => {
            fetchValues.action.fetchText.mockImplementation(() => {
                throw new Error("boom");
            });
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            let updateResult;
            await act(async () => {
                updateResult = await result.current.action.attachObjectToParent(pid, "foo:122", "1");
            });
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A123/parent/foo%3A122",
                { method: "PUT", body: "1" },
            );
            expect(updateResult).toEqual("boom");
        });
    });

    describe("detachObjectFromParent", () => {
        const pid = "foo:123";

        it("detaches parents successfully", async () => {
            fetchValues.action.fetchText.mockResolvedValue("ok");
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });

            // Load data into storage so we can test that it gets cleared out after updates:
            const fakeObjectDetails = { foo: "bar" };
            fetchValues.action.fetchJSON.mockResolvedValue(fakeObjectDetails);
            await act(async() => {
                await result.current.action.loadObjectDetailsIntoStorage(pid);
            });
            expect(result.current.state.objectDetailsStorage[pid]).toEqual(fakeObjectDetails);
            const fakeParentDetails = ["foo", "bar"];
            fetchValues.action.fetchJSON.mockResolvedValue(fakeParentDetails);
            await act(async() => {
                await result.current.action.loadParentDetailsIntoStorage(pid);
            });
            expect(result.current.state.parentDetailsStorage[pid]["full"]).toEqual(fakeParentDetails);
            const fakeChildPage = ["boop"];
            fetchValues.action.fetchJSON.mockResolvedValue(fakeChildPage);
            await act(async() => {
                await result.current.action.loadChildrenIntoStorage("foo:122", 1, 1);
            });
            const expectedKey = result.current.action.getChildListStorageKey("foo:122", 1, 1);
            expect(result.current.state.childListStorage[expectedKey]).toEqual(fakeChildPage);

            // Now run the actual test:
            let updateResult;
            await act(async () => {
                updateResult = await result.current.action.detachObjectFromParent(pid, "foo:122");
            });
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A123/parent/foo%3A122",
                { method: "DELETE" },
            );
            expect(updateResult).toEqual("ok");

            // Various caches should now be empty due to clearing of changed data:
            expect(result.current.state.objectDetailsStorage).toEqual({});
            expect(result.current.state.parentDetailsStorage).toEqual({});
            expect(result.current.state.childListStorage).toEqual({});
        });

        it("handles exceptions on fetchText call", async () => {
            fetchValues.action.fetchText.mockImplementation(() => {
                throw new Error("boom");
            });
            const { result } = await renderHook(() => useEditorContext(), { wrapper: EditorContextProvider });
            let updateResult;
            await act(async () => {
                updateResult = await result.current.action.detachObjectFromParent(pid, "foo:122");
            });
            expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A123/parent/foo%3A122",
                { method: "DELETE" },
            );
            expect(updateResult).toEqual("boom");
        });
    });
});
