import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import { act } from "react-dom/test-utils";
import ObjectOrder from "./ObjectOrder";

const mockUseEditorContext = jest.fn();
jest.mock("../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

const mockUseFetchContext = jest.fn();
jest.mock("../../context/FetchContext", () => ({
    useFetchContext: () => {
        return mockUseFetchContext();
    },
}));

describe("ObjectOrder", () => {
    let editorValues;
    let fetchContextValues;
    const pid = "foo:123";
    beforeEach(() => {
        editorValues = {
            state: {
                objectDetailsStorage: {},
            },
            action: {
                clearPidFromChildListStorage: jest.fn(),
                removeFromObjectDetailsStorage: jest.fn(),
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
        fetchContextValues = {
            action: {
                fetchJSON: jest.fn(),
                fetchText: jest.fn(),
            },
        };
        mockUseFetchContext.mockReturnValue(fetchContextValues);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    function checkSnapshot() {
        const tree = renderer.create(<ObjectOrder pid={pid} />).toJSON();
        expect(tree).toMatchSnapshot();
    }

    it("defaults to title order for a pending object", () => {
        checkSnapshot();
    });

    it("displays a custom-sorted object correctly", () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, sortOn: "custom" };
        checkSnapshot();
    });

    it("can be aborted via confirmation dialog", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, sortOn: "custom" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        fetchContextValues.action.fetchText.mockResolvedValue("ok");
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
        render(<ObjectOrder pid={pid} />);
        await act(() => userEvent.setup().click(screen.getByRole("button")));
        expect(fetchContextValues.action.fetchText).not.toHaveBeenCalled();
        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(editorValues.action.removeFromObjectDetailsStorage).not.toHaveBeenCalled();
        expect(editorValues.action.clearPidFromChildListStorage).not.toHaveBeenCalled();
    });

    it("saves changes to an empty collection correctly", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, sortOn: "custom" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        fetchContextValues.action.fetchText.mockResolvedValue("ok");
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        await act(() => {
            render(<ObjectOrder pid={pid} />);
        });
        await act(() => {
            userEvent.setup().click(screen.getByRole("button"));
        });
        await waitFor(() =>
            expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A123/sortOn",
                { body: "title", method: "PUT" },
            ),
        );
        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(editorValues.action.removeFromObjectDetailsStorage).toHaveBeenCalledWith(pid);
        expect(editorValues.action.clearPidFromChildListStorage).toHaveBeenCalledWith(pid);
    });

    it("handles sort save failure", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, sortOn: "custom" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        fetchContextValues.action.fetchText.mockResolvedValue("kaboom");
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        await act(() => {
            render(<ObjectOrder pid={pid} />);
        });
        await act(() => {
            userEvent.setup().click(screen.getByRole("button"));
        });
        await waitFor(() =>
            expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A123/sortOn",
                { body: "title", method: "PUT" },
            ),
        );
        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(screen.queryAllByText("Changing foo:123 sort to title -- unexpected error")).toHaveLength(1);
        expect(editorValues.action.removeFromObjectDetailsStorage).not.toHaveBeenCalled();
        expect(editorValues.action.clearPidFromChildListStorage).not.toHaveBeenCalled();
    });

    it("handles child save failure correctly when switching to custom", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, sortOn: "title" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 1, docs: [{ id: "foo:125" }] });
        fetchContextValues.action.fetchText.mockResolvedValueOnce("ok");
        fetchContextValues.action.fetchText.mockResolvedValueOnce("not ok");
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        await act(() => {
            render(<ObjectOrder pid={pid} />);
        });
        await act(() => {
            userEvent.setup().click(screen.getByRole("button"));
        });
        await waitFor(() =>
            expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A125/positionInParent/foo%3A123",
                { body: 1, method: "PUT" },
            ),
        );
        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(editorValues.action.removeFromObjectDetailsStorage).toHaveBeenCalledWith(pid);
        expect(editorValues.action.clearPidFromChildListStorage).toHaveBeenCalledWith(pid);
        expect(screen.queryAllByText("Setting foo:125 to position 1 -- unexpected error")).toHaveLength(1);
    });

    it("handles child save failure correctly when switching to title", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, sortOn: "custom" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 1, docs: [{ id: "foo:125" }] });
        fetchContextValues.action.fetchText.mockResolvedValueOnce("ok");
        fetchContextValues.action.fetchText.mockResolvedValueOnce("not ok");
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        await act(() => {
            render(<ObjectOrder pid={pid} />);
        });
        await act(() => {
            userEvent.setup().click(screen.getByRole("button"));
        });
        await waitFor(() =>
            expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A125/positionInParent/foo%3A123",
                { method: "DELETE" },
            ),
        );
        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(editorValues.action.removeFromObjectDetailsStorage).toHaveBeenCalledWith(pid);
        expect(editorValues.action.clearPidFromChildListStorage).toHaveBeenCalledWith(pid);
        expect(screen.queryAllByText("Clearing order for foo:125 -- unexpected error")).toHaveLength(1);
    });

    it("successfully updates children", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, sortOn: "custom" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 1, docs: [{ id: "foo:125" }] });
        fetchContextValues.action.fetchText.mockResolvedValue("ok");
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        await act(() => {
            render(<ObjectOrder pid={pid} />);
        });
        await act(() => {
            userEvent.setup().click(screen.getByRole("button"));
        });
        await waitFor(() =>
            expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A125/positionInParent/foo%3A123",
                { method: "DELETE" },
            ),
        );
        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(editorValues.action.removeFromObjectDetailsStorage).toHaveBeenCalledWith(pid);
        expect(editorValues.action.clearPidFromChildListStorage).toHaveBeenCalledWith(pid);
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/object/foo%3A123/sortOn",
            { body: "title", method: "PUT" },
        );
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledTimes(2);
    });
});
