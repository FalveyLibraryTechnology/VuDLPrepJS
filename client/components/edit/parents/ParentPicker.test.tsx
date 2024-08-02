import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import { act } from "react-dom/test-utils";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import ParentPicker from "./ParentPicker";
import { waitFor } from "@testing-library/dom";

const mockUseGlobalContext = jest.fn();
jest.mock("../../../context/GlobalContext", () => ({
    useGlobalContext: () => {
        return mockUseGlobalContext();
    },
}));
const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));
const mockUseFetchContext = jest.fn();
jest.mock("../../../context/FetchContext", () => ({
    useFetchContext: () => {
        return mockUseFetchContext();
    },
}));
const placeholderFunction = (pid: string) => {
    // This placeholder function should never get called,
    // but we'll implement it as a safety fallback.
    throw new Error("Unexpected call: " + pid);
};
let errorCallback = placeholderFunction;
jest.mock("../ObjectLoader", () => (args) => {
    errorCallback = args.errorCallback;
    return "ObjectLoader: " + JSON.stringify(args);
});
let setSelected = placeholderFunction;
jest.mock("../PidPicker", () => (args) => {
    setSelected = args.setSelected;
    return "PidPicker: " + JSON.stringify(args);
});

describe("ParentPicker", () => {
    let globalValues;
    let editorValues;
    let fetchValues;
    const pid = "foo:123";
    const parentPid = "foo:122";
    beforeEach(() => {
        globalValues = {
            action: {
                setSnackbarState: jest.fn(),
            },
        };
        editorValues = {
            state: {
                objectDetailsStorage: {},
            },
            action: {
                attachObjectToParent: jest.fn(),
            },
        };
        fetchValues = {
            action: {
                fetchText: jest.fn(),
            },
        };
        mockUseGlobalContext.mockReturnValue(globalValues);
        mockUseEditorContext.mockReturnValue(editorValues);
        mockUseFetchContext.mockReturnValue(fetchValues);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders correctly with no data loaded", () => {
        const tree = renderer.create(<ParentPicker pid={pid} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders correctly with a selected but unloaded parent", async () => {
        const tree = renderer.create(<ParentPicker pid={pid} />);
        renderer.act(() => {
            setSelected(parentPid);
        });
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("renders correctly with a selected, loaded, title-sorted parent", async () => {
        editorValues.state.objectDetailsStorage[parentPid] = {
            sortOn: "title",
        };
        const tree = renderer.create(<ParentPicker pid={pid} />);
        renderer.act(() => {
            setSelected(parentPid);
        });
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("adds a title-sorted parent", async () => {
        editorValues.action.attachObjectToParent.mockResolvedValue("ok");
        editorValues.state.objectDetailsStorage[parentPid] = {
            sortOn: "title",
        };
        render(<ParentPicker pid={pid} />);
        await act(() => setSelected(parentPid));
        await userEvent.setup().click(screen.getByRole("button"));
        await waitFor(() => expect(globalValues.action.setSnackbarState).toHaveBeenCalled());
        expect(editorValues.action.attachObjectToParent).toHaveBeenCalledWith(pid, parentPid, "");
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "Successfully added foo:123 to foo:122",
            open: true,
            severity: "info",
        });
    });

    it("handles save failure gracefully", async () => {
        editorValues.action.attachObjectToParent.mockResolvedValue("not ok");
        editorValues.state.objectDetailsStorage[parentPid] = {
            sortOn: "title",
        };
        render(<ParentPicker pid={pid} />);
        await act(() => setSelected(parentPid));
        await userEvent.setup().click(screen.getByRole("button"));
        await waitFor(() => expect(globalValues.action.setSnackbarState).toHaveBeenCalled());
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "not ok",
            open: true,
            severity: "error",
        });
    });

    it("renders correctly with a selected, loaded, custom-sorted parent", async () => {
        editorValues.state.objectDetailsStorage[parentPid] = {
            sortOn: "custom",
        };
        const tree = renderer.create(<ParentPicker pid={pid} />);
        renderer.act(() => {
            setSelected(parentPid);
        });
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("adds a custom-sorted parent with manual position entry", async () => {
        editorValues.action.attachObjectToParent.mockResolvedValue("ok");
        editorValues.state.objectDetailsStorage[parentPid] = {
            sortOn: "custom",
        };
        render(<ParentPicker pid={pid} />);
        await act(() => setSelected(parentPid));
        await act(async () => {
            fireEvent.change(screen.getByRole("textbox", { name: "Position:" }), { target: { value: "100" } });
        });
        await userEvent.setup().click(screen.getByRole("button", { name: "Add" }));
        await waitFor(() => expect(globalValues.action.setSnackbarState).toHaveBeenCalled());
        expect(editorValues.action.attachObjectToParent).toHaveBeenCalledWith(pid, parentPid, "100");
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "Successfully added foo:123 to foo:122",
            open: true,
            severity: "info",
        });
    });

    it("adds a custom-sorted parent using the 'last position' button", async () => {
        fetchValues.action.fetchText.mockResolvedValueOnce("999");
        editorValues.action.attachObjectToParent.mockResolvedValue("ok");
        editorValues.state.objectDetailsStorage[parentPid] = {
            sortOn: "custom",
        };
        render(<ParentPicker pid={pid} />);
        await act(() => setSelected(parentPid));
        await userEvent.setup().click(screen.getByRole("button"));
        await waitFor(() => expect(fetchValues.action.fetchText).toHaveBeenCalled());
        await userEvent.setup().click(screen.getByRole("button", { name: "Add" }));
        await waitFor(() => expect(globalValues.action.setSnackbarState).toHaveBeenCalled());
        expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/object/foo%3A122/lastChildPosition",
            { method: "GET" },
        );
        expect(editorValues.action.attachObjectToParent).toHaveBeenCalledWith(pid, parentPid, "1000");
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "Successfully added foo:123 to foo:122",
            open: true,
            severity: "info",
        });
    });

    it("defaults to 1 if the 'last position' request fails", async () => {
        fetchValues.action.fetchText.mockImplementationOnce(() => {
            throw new Error("kaboom");
        });
        editorValues.action.attachObjectToParent.mockResolvedValue("ok");
        editorValues.state.objectDetailsStorage[parentPid] = {
            sortOn: "custom",
        };
        render(<ParentPicker pid={pid} />);
        await act(() => setSelected(parentPid));
        await userEvent.setup().click(screen.getByRole("button"));
        await waitFor(() => expect(fetchValues.action.fetchText).toHaveBeenCalled());
        await userEvent.setup().click(screen.getByRole("button", { name: "Add" }));
        await waitFor(() => expect(globalValues.action.setSnackbarState).toHaveBeenCalled());
        expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/object/foo%3A122/lastChildPosition",
            { method: "GET" },
        );
        expect(editorValues.action.attachObjectToParent).toHaveBeenCalledWith(pid, parentPid, "1");
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "Successfully added foo:123 to foo:122",
            open: true,
            severity: "info",
        });
    });

    it("handles object loading errors gracefully", async () => {
        const tree = renderer.create(<ParentPicker pid={pid} />);
        await renderer.act(async () => {
            setSelected(parentPid);
        });
        await renderer.act(async () => {
            errorCallback(parentPid);
        });
        await waitFor(() => expect(globalValues.action.setSnackbarState).toHaveBeenCalled());
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "Cannot load details for foo:122. Are you sure this is a valid PID?",
            open: true,
            severity: "error",
        });
        expect(tree.toJSON()).toMatchSnapshot();
    });
});
