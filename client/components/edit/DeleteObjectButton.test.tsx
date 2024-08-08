import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act } from "react-dom/test-utils";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import DeleteObjectButton from "./DeleteObjectButton";

const mockUseGlobalContext = jest.fn();
jest.mock("../../context/GlobalContext", () => ({
    useGlobalContext: () => {
        return mockUseGlobalContext();
    },
}));

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

jest.mock("@mui/icons-material/Delete", () => () => "DeleteIcon");

describe("DeleteObjectButton", () => {
    let globalValues;
    let editorValues;
    let fetchContextValues;
    const pid = "foo:123";
    beforeEach(() => {
        globalValues = {
            action: {
                closeModal: jest.fn(),
                isModalOpen: jest.fn(),
                openModal: jest.fn(),
                setSnackbarState: jest.fn(),
            },
        };
        editorValues = {
            state: {
                trashPid: "foo:999",
                objectDetailsStorage: {},
            },
            action: {
                getParentCountForPid: jest.fn(),
                attachObjectToParent: jest.fn(),
                moveObjectToParent: jest.fn(),
                updateObjectState: jest.fn(),
            },
        };
        fetchContextValues = {
            action: {
                fetchJSON: jest.fn(),
            },
        };
        mockUseGlobalContext.mockReturnValue(globalValues);
        mockUseEditorContext.mockReturnValue(editorValues);
        mockUseFetchContext.mockReturnValue(fetchContextValues);
        globalValues.action.isModalOpen.mockReturnValue(true);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it("renders correctly when data is not loaded", () => {
        let tree;
        renderer.act(() => {
            tree = renderer.create(<DeleteObjectButton pid={pid} />);
        });
        expect(tree.toJSON()).toEqual(null);
    });

    it("renders correctly when data is loaded", async () => {
        editorValues.state.objectDetailsStorage[pid] = { foo: "bar" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 100 });
        let tree;
        renderer.act(() => {
            tree = renderer.create(<DeleteObjectButton pid={pid} />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("can be aborted via confirm", async () => {
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Inactive" };
        editorValues.action.moveObjectToParent.mockResolvedValue("ok");
        editorValues.action.updateObjectState.mockResolvedValue(["Status saved successfully.", "success"]);
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 1000 });
        await act(async () => {
            render(<DeleteObjectButton pid={pid} />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        const user = userEvent.setup();
        await user.click(screen.getByText("DeleteIcon"));
        expect(confirmSpy).toHaveBeenCalledWith("Are you sure you wish to delete PID foo:123 and its 1000 children?");
        expect(editorValues.action.moveObjectToParent).not.toHaveBeenCalled();
        expect(editorValues.action.updateObjectState).not.toHaveBeenCalled();
        expect(globalValues.action.setSnackbarState).not.toHaveBeenCalled();
    });

    it("saves data correctly", async () => {
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Inactive" };
        editorValues.action.moveObjectToParent.mockResolvedValue("ok");
        editorValues.action.getParentCountForPid.mockReturnValue(1);
        editorValues.action.updateObjectState.mockResolvedValue(["Status saved successfully.", "success"]);
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        await act(async () => {
            render(<DeleteObjectButton pid={pid} />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        const user = userEvent.setup();
        await user.click(screen.getByText("DeleteIcon"));
        await waitFor(() =>
            expect(editorValues.action.updateObjectState).toHaveBeenCalledWith(pid, "Deleted", 0, expect.anything()),
        );
        expect(editorValues.action.moveObjectToParent).toHaveBeenCalledWith(pid, "foo:999", "");
        expect(confirmSpy).toHaveBeenCalledWith("Are you sure you wish to delete PID foo:123?");
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: `Successfully moved ${pid} to foo:999`,
            open: true,
            severity: "info",
        });
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "Status saved successfully.",
            open: true,
            severity: "success",
        });
    });

    it("saves data correctly in the no parents special case", async () => {
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Inactive" };
        editorValues.action.attachObjectToParent.mockResolvedValue("ok");
        editorValues.action.getParentCountForPid.mockReturnValue(null);
        editorValues.action.updateObjectState.mockResolvedValue(["Status saved successfully.", "success"]);
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        await act(async () => {
            render(<DeleteObjectButton pid={pid} />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        const user = userEvent.setup();
        fetchContextValues.action.fetchJSON.mockResolvedValue({ parents: [] });
        await user.click(screen.getByText("DeleteIcon"));
        await waitFor(() =>
            expect(editorValues.action.updateObjectState).toHaveBeenCalledWith(pid, "Deleted", 0, expect.anything()),
        );
        expect(editorValues.action.attachObjectToParent).toHaveBeenCalledWith(pid, "foo:999", "");
        expect(confirmSpy).toHaveBeenCalledWith("Are you sure you wish to delete PID foo:123?");
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: `Successfully moved ${pid} to foo:999`,
            open: true,
            severity: "info",
        });
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "Status saved successfully.",
            open: true,
            severity: "success",
        });
    });

    it("handles retrieval failure in the no parents special case", async () => {
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Inactive" };
        editorValues.action.attachObjectToParent.mockResolvedValue("ok");
        editorValues.action.getParentCountForPid.mockReturnValue(null);
        editorValues.action.updateObjectState.mockResolvedValue(["Status saved successfully.", "success"]);
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        await act(async () => {
            render(<DeleteObjectButton pid={pid} />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        const user = userEvent.setup();
        fetchContextValues.action.fetchJSON.mockImplementation(() => {
            throw new Error("kaboom");
        });
        await user.click(screen.getByText("DeleteIcon"));
        await waitFor(() =>
            expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
                message: "kaboom",
                open: true,
                severity: "error",
            }),
        );
        expect(editorValues.action.updateObjectState).not.toHaveBeenCalled();
        expect(editorValues.action.attachObjectToParent).not.toHaveBeenCalled();
        expect(confirmSpy).toHaveBeenCalledWith("Are you sure you wish to delete PID foo:123?");
    });

    it("handles state change failure correctly", async () => {
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Inactive" };
        editorValues.action.moveObjectToParent.mockResolvedValue("ok");
        editorValues.action.getParentCountForPid.mockReturnValue(1);
        editorValues.action.updateObjectState.mockImplementation((foo, bar, baz, callback) => {
            callback("I don't feel well");
            throw new Error("kaboom");
        });
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        await act(async () => {
            render(<DeleteObjectButton pid={pid} />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        const user = userEvent.setup();
        await user.click(screen.getByText("DeleteIcon"));
        await waitFor(() =>
            expect(editorValues.action.updateObjectState).toHaveBeenCalledWith(pid, "Deleted", 0, expect.anything()),
        );
        expect(editorValues.action.moveObjectToParent).toHaveBeenCalledWith(pid, "foo:999", "");
        expect(confirmSpy).toHaveBeenCalledWith("Are you sure you wish to delete PID foo:123?");
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: `Successfully moved ${pid} to foo:999`,
            open: true,
            severity: "info",
        });
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "I don't feel well",
            open: true,
            severity: "info",
        });
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "kaboom",
            open: true,
            severity: "error",
        });
    });

    it("handles move failure correctly", async () => {
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Inactive" };
        editorValues.action.moveObjectToParent.mockResolvedValue("not ok");
        editorValues.action.getParentCountForPid.mockReturnValue(1);
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        await act(async () => {
            render(<DeleteObjectButton pid={pid} />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        const user = userEvent.setup();
        await user.click(screen.getByText("DeleteIcon"));
        await waitFor(() => expect(editorValues.action.moveObjectToParent).toHaveBeenCalledWith(pid, "foo:999", ""));
        expect(confirmSpy).toHaveBeenCalledWith("Are you sure you wish to delete PID foo:123?");
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: `not ok`,
            open: true,
            severity: "error",
        });
        expect(editorValues.action.updateObjectState).not.toHaveBeenCalled();
    });
});
