import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import ParentList from "./ParentList";
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

jest.mock("@mui/icons-material/Delete", () => (props) => props.titleAccess);

describe("ParentList", () => {
    let globalValues;
    let editorValues;
    let fetchValues;
    let pid: string;
    beforeEach(() => {
        pid = "foo:123";
        globalValues = {
            action: {
                setSnackbarState: jest.fn(),
            },
        };
        editorValues = {
            state: {
                parentDetailsStorage: {
                    "foo:123": {
                        shallow: {
                            parents: [
                                {
                                    pid: "foo:122",
                                    title: "Parent",
                                    parents: [],
                                },
                            ],
                        },
                        full: {
                            parents: [
                                {
                                    pid: "foo:122",
                                    title: "Parent",
                                    parents: [
                                        {
                                            pid: "foo:121",
                                            title: "Grandparent",
                                            parents: [
                                                {
                                                    pid: "foo:120",
                                                    title: "Great-grandparent",
                                                    parents: [],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
            },
            action: {
                clearPidFromChildListStorage: jest.fn(),
                loadParentDetailsIntoStorage: jest.fn(),
                removeFromObjectDetailsStorage: jest.fn(),
                removeFromParentDetailsStorage: jest.fn(),
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

    it("triggers a data load if necessary", () => {
        editorValues.state.parentDetailsStorage = {};
        render(<ParentList pid={pid} />);
        expect(editorValues.action.loadParentDetailsIntoStorage).toHaveBeenCalledWith(pid, true);
    });

    it("renders an empty list correctly", () => {
        editorValues.state.parentDetailsStorage = {
            "foo:123": {
                shallow: {
                    parents: [],
                },
            },
        };
        const tree = renderer.create(<ParentList pid={pid} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders a populated parent list correctly (shallow mode)", () => {
        const tree = renderer.create(<ParentList pid={pid} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders a populated parent list correctly (full mode)", () => {
        const tree = renderer.create(<ParentList pid={pid} initiallyShallow={false} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("deletes parents on button click plus confirmation", async () => {
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        fetchValues.action.fetchText.mockResolvedValue("ok");
        render(<ParentList pid={pid} />);
        await userEvent.setup().click(screen.getByText("Delete parent foo:122"));
        expect(confirmSpy).toHaveBeenCalledWith("Are you sure you wish to remove this parent?");
        expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/object/foo%3A123/parent/foo%3A122",
            { method: "DELETE" },
        );
        await waitFor(() => expect(editorValues.action.removeFromObjectDetailsStorage).toHaveBeenCalled());
        expect(editorValues.action.removeFromObjectDetailsStorage).toHaveBeenCalledWith(pid);
        expect(editorValues.action.removeFromParentDetailsStorage).toHaveBeenCalledWith(pid);
        expect(editorValues.action.clearPidFromChildListStorage).toHaveBeenCalledWith("foo:122");
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "Successfully removed foo:123 from foo:122",
            open: true,
            severity: "info",
        });
    });

    it("does not delete parents if confirmation is canceled", async () => {
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
        render(<ParentList pid={pid} />);
        await userEvent.setup().click(screen.getByText("Delete parent foo:122"));
        expect(confirmSpy).toHaveBeenCalledWith("Are you sure you wish to remove this parent?");
        expect(fetchValues.action.fetchText).not.toHaveBeenCalled();
    });

    it("handles bad return statuses", async () => {
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        fetchValues.action.fetchText.mockResolvedValue("not ok");
        render(<ParentList pid={pid} />);
        await userEvent.setup().click(screen.getByText("Delete parent foo:122"));
        expect(confirmSpy).toHaveBeenCalledWith("Are you sure you wish to remove this parent?");
        expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/object/foo%3A123/parent/foo%3A122",
            { method: "DELETE" },
        );
        await waitFor(() => expect(globalValues.action.setSnackbarState).toHaveBeenCalled());
        expect(editorValues.action.removeFromObjectDetailsStorage).not.toHaveBeenCalled();
        expect(editorValues.action.removeFromParentDetailsStorage).not.toHaveBeenCalled();
        expect(editorValues.action.clearPidFromChildListStorage).not.toHaveBeenCalled();
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "not ok",
            open: true,
            severity: "error",
        });
    });

    it("handles exceptions on fetchText call", async () => {
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        fetchValues.action.fetchText.mockImplementation(() => {
            throw new Error("boom");
        });
        render(<ParentList pid={pid} />);
        await userEvent.setup().click(screen.getByText("Delete parent foo:122"));
        expect(confirmSpy).toHaveBeenCalledWith("Are you sure you wish to remove this parent?");
        expect(fetchValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/object/foo%3A123/parent/foo%3A122",
            { method: "DELETE" },
        );
        await waitFor(() => expect(globalValues.action.setSnackbarState).toHaveBeenCalled());
        expect(editorValues.action.removeFromObjectDetailsStorage).not.toHaveBeenCalled();
        expect(editorValues.action.removeFromParentDetailsStorage).not.toHaveBeenCalled();
        expect(editorValues.action.clearPidFromChildListStorage).not.toHaveBeenCalled();
        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            message: "boom",
            open: true,
            severity: "error",
        });
    });
});
