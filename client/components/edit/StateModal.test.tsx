import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act } from "react-dom/test-utils";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import StateModal from "./StateModal";

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

jest.mock("./ObjectLoader", () => (args) => JSON.stringify(args));

jest.mock(
    "@mui/material/Dialog",
    () =>
        function MockDialog(props: { open: boolean; children: unknown }) {
            return (
                <>
                    {"Dialog"}
                    {props.open ? "open" : "closed"}
                    {props.children}
                </>
            );
        },
);
jest.mock("@mui/material/DialogTitle", () => (props) => props.children);
jest.mock("@mui/material/DialogContent", () => (props) => props.children);
jest.mock("@mui/material/Grid", () => (props) => props.children);
jest.mock("@mui/icons-material/Close", () => () => "CloseIcon");

describe("StateModal", () => {
    let editorValues;
    let fetchContextValues;
    const pid = "foo:123";
    beforeEach(() => {
        editorValues = {
            state: {
                stateModalActivePid: pid,
                isStateModalOpen: true,
                objectDetailsStorage: {},
            },
            action: {
                removeFromObjectDetailsStorage: jest.fn(),
                setSnackbarState: jest.fn(),
                toggleStateModal: jest.fn(),
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

    it("renders correctly when closed", () => {
        editorValues.state.isStateModalOpen = false;
        let tree;
        renderer.act(() => {
            tree = renderer.create(<StateModal />);
        });
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("renders correctly for a pending object", () => {
        let tree;
        renderer.act(() => {
            tree = renderer.create(<StateModal />);
        });
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("renders correctly for a loaded object with children", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Active" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 100 });
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(<StateModal />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("renders correctly for a loaded object without children", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Active" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(<StateModal />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("saves data correctly", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Inactive" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        fetchContextValues.action.fetchText.mockResolvedValue("ok");
        await act(async () => {
            render(<StateModal />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        const user = userEvent.setup();
        await user.click(screen.getByText("Active"));
        await user.click(screen.getByText("Save"));
        await waitFor(() =>
            expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A123/state",
                { body: "Active", method: "PUT" },
            ),
        );
        expect(editorValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "Status saved successfully.",
            open: true,
            severity: "success",
        });
        expect(editorValues.action.removeFromObjectDetailsStorage).toHaveBeenCalledWith(pid);
        expect(editorValues.action.toggleStateModal).toHaveBeenCalled();
    });

    it("does not save when nothing changes", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Inactive" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        fetchContextValues.action.fetchText.mockResolvedValue("ok");
        await act(async () => {
            render(<StateModal />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        await userEvent.setup().click(screen.getByText("Save"));
        await waitFor(() =>
            expect(editorValues.action.setSnackbarState).toHaveBeenCalledWith({
                message: "No changes were made.",
                open: true,
                severity: "info",
            }),
        );
        expect(fetchContextValues.action.fetchText).not.toHaveBeenCalled();
        expect(editorValues.action.removeFromObjectDetailsStorage).not.toHaveBeenCalled();
        expect(editorValues.action.toggleStateModal).not.toHaveBeenCalled();
    });

    it("handles save failure gracefully", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Inactive" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 0 });
        fetchContextValues.action.fetchText.mockResolvedValue("not ok");
        await act(async () => {
            render(<StateModal />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        const user = userEvent.setup();
        await user.click(screen.getByText("Active"));
        await user.click(screen.getByText("Save"));
        await waitFor(() =>
            expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A123/state",
                { body: "Active", method: "PUT" },
            ),
        );
        expect(editorValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: 'Status failed to save; "not ok"',
            open: true,
            severity: "error",
        });
        expect(editorValues.action.removeFromObjectDetailsStorage).not.toHaveBeenCalled();
        expect(editorValues.action.toggleStateModal).toHaveBeenCalled();
    });

    it("handles child save failure gracefully", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Inactive" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 1, docs: [{ id: "foo:125" }] });
        fetchContextValues.action.fetchText.mockResolvedValue("not ok");
        await act(async () => {
            render(<StateModal />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        const user = userEvent.setup();
        await user.click(screen.getByText("Active"));
        await user.click(screen.getByText("Update 1 children to match"));
        await user.click(screen.getByText("Save"));
        await waitFor(() =>
            expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A125/state",
                { body: "Active", method: "PUT" },
            ),
        );
        expect(editorValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: 'Status failed to save; "not ok"',
            open: true,
            severity: "error",
        });
        expect(editorValues.action.removeFromObjectDetailsStorage).not.toHaveBeenCalled();
        expect(editorValues.action.toggleStateModal).toHaveBeenCalled();
    });

    it("updates children correctly", async () => {
        editorValues.state.objectDetailsStorage[pid] = { pid, state: "Inactive" };
        fetchContextValues.action.fetchJSON.mockResolvedValue({ numFound: 1, docs: [{ id: "foo:125" }] });
        fetchContextValues.action.fetchText.mockResolvedValue("ok");
        await act(async () => {
            render(<StateModal />);
        });
        await waitFor(() => expect(fetchContextValues.action.fetchJSON).toHaveBeenCalled());
        const user = userEvent.setup();
        await user.click(screen.getByText("Active"));
        await user.click(screen.getByText("Update 1 children to match"));
        await user.click(screen.getByText("Save"));
        await waitFor(() =>
            expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
                "http://localhost:9000/api/edit/object/foo%3A123/state",
                { body: "Active", method: "PUT" },
            ),
        );
        expect(editorValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "Status saved successfully.",
            open: true,
            severity: "success",
        });
        expect(fetchContextValues.action.fetchText).toHaveBeenNthCalledWith(
            1,
            "http://localhost:9000/api/edit/object/foo%3A125/state",
            { body: "Active", method: "PUT" },
        );
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledTimes(2);
        expect(editorValues.action.removeFromObjectDetailsStorage).toHaveBeenNthCalledWith(1, "foo:125");
        expect(editorValues.action.removeFromObjectDetailsStorage).toHaveBeenNthCalledWith(2, pid);
        expect(editorValues.action.toggleStateModal).toHaveBeenCalled();
    });
});
