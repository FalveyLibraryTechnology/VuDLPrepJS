import React from "react";
import { describe, afterEach, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import DatastreamProcessMetadataContent from "./DatastreamProcessMetadataContent";
import { waitFor } from "@testing-library/react";

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

const mockUseProcessMetadataContext = jest.fn();
jest.mock("../../../context/ProcessMetadataContext", () => ({
    useProcessMetadataContext: () => {
        return mockUseProcessMetadataContext();
    },
}));

const mockUseDatastreamOperation = jest.fn();
jest.mock("../../../hooks/useDatastreamOperation", () => () => {
    return mockUseDatastreamOperation();
});

let mockDatastreamProcessMetadataTaskProps = [];
const DatastreamProcessMetadataTask = function DatastreamProcessMetadataTask(props) {
    mockDatastreamProcessMetadataTaskProps.push(props);
    return "";
};
jest.mock("./DatastreamProcessMetadataTask", () => DatastreamProcessMetadataTask);

jest.mock("@mui/x-date-pickers", () => ({
    DateTimePicker: () => "DateTimePicker",
    LocalizationProvider: () => "LocalizationProvider",
}));

jest.mock("@mui/material/Box", () => (props) => props.children);
jest.mock("@mui/material/FormControl", () => (props) => props.children);
jest.mock("@mui/material/FormLabel", () => (props) => props.children);
jest.mock("@mui/material/Tabs", () => (props) => props.children);
jest.mock("@mui/material/Grid", () => (props) => props.children);

describe("DatastreamProcessMetadataContent", () => {
    let datastreamOperationValues;
    let editorContext;
    let globalValues;
    let processMetadataValues;

    const renderComponent = async (fakeData = {}) => {
        datastreamOperationValues.getProcessMetadata.mockResolvedValue(fakeData);
        processMetadataValues.state = fakeData;

        render(<DatastreamProcessMetadataContent />);

        await waitFor(() => expect(processMetadataValues.action.setMetadata).toHaveBeenCalledWith(fakeData));
    };

    const getRenderedTree = async (fakeData = {}) => {
        datastreamOperationValues.getProcessMetadata.mockResolvedValue(fakeData);
        processMetadataValues.state = fakeData;

        const tree = renderer.create(<DatastreamProcessMetadataContent />);

        await renderer.act(async () => {
            await waitFor(() => expect(processMetadataValues.action.setMetadata).toHaveBeenCalledWith(fakeData));
        });

        return tree.toJSON();
    };

    beforeEach(() => {
        editorContext = {
            state: {
                childListStorage: {},
                objectDetailsStorage: {},
            },
            action: {
                getChildListStorageKey: jest.fn(),
                loadChildrenIntoStorage: jest.fn(),
                loadObjectDetailsIntoStorage: jest.fn(),
            },
        };
        mockUseEditorContext.mockReturnValue(editorContext);
        datastreamOperationValues = {
            uploadProcessMetadata: jest.fn(),
            getProcessMetadata: jest.fn(),
        };
        mockUseDatastreamOperation.mockReturnValue(datastreamOperationValues);
        globalValues = { action: { closeModal: jest.fn() } };
        mockUseGlobalContext.mockReturnValue(globalValues);
        mockDatastreamProcessMetadataTaskProps = [];
        processMetadataValues = {
            state: {},
            action: {
                addTask: jest.fn(),
                deleteTask: jest.fn(),
                setMetadata: jest.fn(),
                setProcessCreator: jest.fn(),
                setProcessDateTime: jest.fn(),
                setProcessLabel: jest.fn(),
                setProcessOrganization: jest.fn(),
                updateTaskAttributes: jest.fn(),
            },
        };
        mockUseProcessMetadataContext.mockReturnValue(processMetadataValues);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders a loading message if content is unavailable", () => {
        datastreamOperationValues.getProcessMetadata.mockResolvedValue({});
        const tree = renderer.create(<DatastreamProcessMetadataContent />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders a form when empty data is loaded", async () => {
        const tree = await getRenderedTree();
        expect(processMetadataValues.action.addTask).toHaveBeenCalledWith(0);
        expect(tree).toMatchSnapshot();
    });

    it("renders a form when non-empty data is loaded", async () => {
        const tree = await getRenderedTree({
            processLabel: "label",
            processCreator: "creator",
            processDateTime: "datetime",
            processOrganization: "organization",
            tasks: [{ id: 1 }, { id: 2 }],
        });
        expect(processMetadataValues.action.addTask).not.toHaveBeenCalled();
        expect(tree).toMatchSnapshot();
    });

    it("has a working save button", async () => {
        await renderComponent();
        await userEvent.setup().click(screen.getByText("Save"));
        expect(datastreamOperationValues.uploadProcessMetadata).toHaveBeenCalledWith(processMetadataValues.state);
    });

    it("supports task updates", async () => {
        await renderComponent({ tasks: [{ id: 1 }] });
        const attr = { foo: "bar" };
        mockDatastreamProcessMetadataTaskProps[0].setAttributes(attr, true);
        expect(processMetadataValues.action.updateTaskAttributes).toHaveBeenCalledWith(0, attr);
    });

    it("supports adding tasks", async () => {
        await renderComponent({ tasks: [{ id: 1 }] });
        mockDatastreamProcessMetadataTaskProps[0].addBelow();
        expect(processMetadataValues.action.addTask).toHaveBeenCalledWith(1);
    });

    it("supports deleting tasks", async () => {
        await renderComponent({ tasks: [{ id: 1 }] });
        mockDatastreamProcessMetadataTaskProps[0].deleteTask();
        expect(processMetadataValues.action.deleteTask).toHaveBeenCalledWith(0);
    });

    it("can be canceled", async () => {
        await renderComponent();
        await userEvent.setup().click(screen.getByText("Cancel"));
        expect(datastreamOperationValues.uploadProcessMetadata).not.toHaveBeenCalled();
        expect(globalValues.action.closeModal).toHaveBeenCalledWith("datastream");
    });
});
