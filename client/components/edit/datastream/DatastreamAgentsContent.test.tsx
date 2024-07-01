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
jest.mock("@mui/material/Grid", () => (props) => props.children);

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
            },
            action: {
                setCurrentAgents: jest.fn(),
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

    it("saves current changes on save changes click", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);

        await act(async () => {
            render(<DatastreamAgentsContent />);
        });
        await waitFor(() => expect(datastreamOperationValues.getAgents).toHaveBeenCalled());
        await userEvent.setup().click(screen.getByText("Save Changes"));

        expect(datastreamOperationValues.uploadAgents).toHaveBeenCalled();
        expect(globalValues.action.closeModal).not.toHaveBeenCalled();
    });

    it("saves current agents and closes the modal", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);

        await act(async () => {
            render(<DatastreamAgentsContent />);
        });
        await waitFor(() => expect(datastreamOperationValues.getAgents).toHaveBeenCalled());
        await userEvent.setup().click(screen.getByText("Save And Close"));

        expect(datastreamOperationValues.uploadAgents).toHaveBeenCalled();
        expect(globalValues.action.closeModal).toHaveBeenCalledWith("datastream");
    });

    it("resets current agents on cancel", async () => {
        datastreamOperationValues.getAgents.mockResolvedValue([]);

        await act(async () => {
            render(<DatastreamAgentsContent />);
        });
        await waitFor(() => expect(datastreamOperationValues.getAgents).toHaveBeenCalled());
        await userEvent.setup().click(screen.getByText("Cancel"));

        expect(datastreamOperationValues.uploadAgents).not.toHaveBeenCalled();
        expect(datastreamOperationValues.getAgents).toHaveBeenCalled();
        expect(editorValues.action.setCurrentAgents).toHaveBeenCalled();
        expect(globalValues.action.closeModal).toHaveBeenCalledWith("datastream");
    });
});
