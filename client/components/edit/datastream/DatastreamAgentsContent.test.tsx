import React from "react";
import { describe, beforeEach, afterEach, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react-dom/test-utils";
import renderer from "react-test-renderer";
import DatastreamAgentsContent from "./DatastreamAgentsContent";

const mockDatastreamAgentsModifyContentRow = jest.fn();
jest.mock("./DatastreamAgentsModifyContentRow", () => (props) => {
    mockDatastreamAgentsModifyContentRow(props);
    return "DatastreamAgentsModifyContentRow";
});
const mockDatastreamAgentsAddContentRow = jest.fn();
jest.mock("./DatastreamAgentsAddContentRow", () => (props) => {
    mockDatastreamAgentsAddContentRow(props);
    return "DatastreamAgentsAddContentRow";
});
const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));
const mockUseGlobalContext = jest.fn();
jest.mock("../../../context/GlobalContext", () => ({
    useGlobalContext: () => {
        return mockUseGlobalContext();
    },
}));
const mockUseDatastreamOperation = jest.fn();
jest.mock("../../../hooks/useDatastreamOperation", () => () => {
    return mockUseDatastreamOperation();
});

let tabChangeFunction: ((tab: number) => void) | null = null;
jest.mock("@mui/material/Tabs", () => (props) => {
    tabChangeFunction = props.onChange;
    return props.children;
});
jest.mock("@mui/material/Tab", () => (props) => `Tab: ${props.label}`);
jest.mock("@mui/material/Grid", () => (props) => props.children);
let pidPickerFunction: ((pid: string) => void) | null = null;
jest.mock("../PidPicker", () => (props) => {
    pidPickerFunction = props.setSelected;
    return "PidPicker: " + JSON.stringify(props);
});

describe("DatastreamAgentsContent", () => {
    let editorValues;
    let globalValues;
    let datastreamOperationValues;
    beforeEach(() => {
        editorValues = {
            state: {
                agentsCatalog: {
                    defaults: {
                        role: "test1",
                        type: "test2",
                        name: "test3",
                    },
                },
                currentAgents: [],
                objectDetailsStorage: {},
            },
            action: {
                setCurrentAgents: jest.fn(),
                loadObjectDetailsIntoStorage: jest.fn(),
            },
        };
        globalValues = {
            action: {
                closeModal: jest.fn(),
            },
        };
        datastreamOperationValues = {
            uploadAgents: jest.fn(),
            getAgents: jest.fn(),
        };
        mockUseEditorContext.mockReturnValue(editorValues);
        mockUseGlobalContext.mockReturnValue(globalValues);
        mockUseDatastreamOperation.mockReturnValue(datastreamOperationValues);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    async function renderComponent() {
        await act(async () => {
            render(<DatastreamAgentsContent />);
        });
    }

    it("renders, and calls getAgents on render", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(<DatastreamAgentsContent />);
        });
        await waitFor(() => expect(datastreamOperationValues.getAgents).toHaveBeenCalled());
        expect(editorValues.action.setCurrentAgents).toHaveBeenCalled();
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("supports tab switching", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(<DatastreamAgentsContent />);
        });
        await waitFor(() => expect(datastreamOperationValues.getAgents).toHaveBeenCalled());
        await renderer.act(async () => {
            tabChangeFunction && tabChangeFunction(null, 1);
        });
        expect(editorValues.action.setCurrentAgents).toHaveBeenCalled();
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("saves current changes on save changes click", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);

        await renderComponent();
        await waitFor(() => expect(datastreamOperationValues.getAgents).toHaveBeenCalled());
        await userEvent.setup().click(screen.getByText("Save Changes"));

        expect(datastreamOperationValues.uploadAgents).toHaveBeenCalled();
        expect(globalValues.action.closeModal).not.toHaveBeenCalled();
    });

    it("saves current agents and closes the modal", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);

        await renderComponent();
        await waitFor(() => expect(datastreamOperationValues.getAgents).toHaveBeenCalled());
        await userEvent.setup().click(screen.getByText("Save And Close"));

        expect(datastreamOperationValues.uploadAgents).toHaveBeenCalled();
        expect(globalValues.action.closeModal).toHaveBeenCalledWith("datastream");
    });

    it("resets current agents on cancel", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);

        await renderComponent();
        await waitFor(() => expect(datastreamOperationValues.getAgents).toHaveBeenCalled());
        await userEvent.setup().click(screen.getByText("Cancel"));

        expect(datastreamOperationValues.uploadAgents).not.toHaveBeenCalled();
        expect(datastreamOperationValues.getAgents).toHaveBeenCalled();
        expect(editorValues.action.setCurrentAgents).toHaveBeenCalled();
        expect(globalValues.action.closeModal).toHaveBeenCalledWith("datastream");
    });

    it("ignores empty PIDs in clone input", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);
        await renderComponent();
        expect(pidPickerFunction).not.toBeNull();
        await act(async () => {
            pidPickerFunction && pidPickerFunction("");
        });
        expect(editorValues.action.loadObjectDetailsIntoStorage).not.toHaveBeenCalled();
    });

    it("handles errors that occur during PID cloning", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);
        await renderComponent();
        const alertSpy = jest.spyOn(window, "alert").mockImplementation(jest.fn());
        editorValues.action.loadObjectDetailsIntoStorage.mockImplementation(
            (pid: string, errorCallback: () => void) => {
                expect(pid).toEqual("foo:123");
                errorCallback();
            },
        );
        expect(pidPickerFunction).not.toBeNull();
        await act(async () => {
            pidPickerFunction && pidPickerFunction("foo:123");
        });
        expect(alertSpy).toHaveBeenCalledWith("Cannot load PID: foo:123");
    });

    it("supports loading PID data into storage after selection for cloning", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);
        await renderComponent();
        expect(pidPickerFunction).not.toBeNull();
        await act(async () => {
            pidPickerFunction && pidPickerFunction("foo:123");
        });
        expect(editorValues.action.loadObjectDetailsIntoStorage).toHaveBeenCalledWith("foo:123", expect.anything());
    });

    it("validates datastreams before cloning metadata from another PID", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);
        editorValues.state.objectDetailsStorage = {
            "foo:123": {
                datastreams: [],
            },
        };
        const alertSpy = jest.spyOn(window, "alert").mockImplementation(jest.fn());
        await renderComponent();
        expect(pidPickerFunction).not.toBeNull();
        await act(async () => {
            pidPickerFunction && pidPickerFunction("foo:123");
        });
        await userEvent.setup().click(screen.getByText("Clone"));
        expect(alertSpy).toHaveBeenCalledWith("foo:123 does not contain an AGENTS datastream.");
    });

    it("can clone metadata from another PID", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);
        editorValues.state.objectDetailsStorage = {
            "foo:123": {
                datastreams: ["AGENTS"],
            },
        };
        await renderComponent();
        expect(pidPickerFunction).not.toBeNull();
        await act(async () => {
            pidPickerFunction && pidPickerFunction("foo:123");
        });
        await userEvent.setup().click(screen.getByText("Clone"));
        expect(datastreamOperationValues.getAgents).toHaveBeenCalledWith("foo:123", true);
    });
});
