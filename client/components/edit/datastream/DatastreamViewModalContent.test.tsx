import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import DatastreamViewModalContent from "./DatastreamViewModalContent";
import { waitFor } from "@testing-library/react";

const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

const mockUseDatastreamOperation = jest.fn();
jest.mock("../../../hooks/useDatastreamOperation", () => () => mockUseDatastreamOperation());
const mockDatatypeContent = jest.fn();
jest.mock("../../shared/DatatypeContent", () => (props) => {
    mockDatatypeContent(props);
    return "DatatypeContent: " + JSON.stringify(props);
});
describe("DatastreamViewModalContent", () => {
    let datastreamOperationValues;
    let editorValues;
    let data;
    let createObjectURL;
    beforeEach(() => {
        datastreamOperationValues = {
            viewDatastream: jest.fn(),
        };
        data = "test3";
        createObjectURL = jest.fn().mockReturnValue(data);
        mockUseDatastreamOperation.mockReturnValue(datastreamOperationValues);
        Object.defineProperty(global, "URL", {
            value: {
                createObjectURL,
            },
            writable: true,
        });
        editorValues = {
            state: {
                activeDatastream: "foo",
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it("renders for viewable content", async () => {
        const response = {
            data: "test1",
            mimeType: "test2",
        };
        datastreamOperationValues.viewDatastream.mockResolvedValue(response);
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(<DatastreamViewModalContent />);
            await waitFor(() => expect(datastreamOperationValues.viewDatastream).toHaveBeenCalled());
        });
        expect(tree.toJSON()).toMatchSnapshot();
        expect(mockDatatypeContent).toHaveBeenCalledWith(response);
    });

    it("renders for download-only content", async () => {
        const response = {
            data: "test1",
            mimeType: "image/tiff",
        };
        datastreamOperationValues.viewDatastream.mockResolvedValue(response);
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(<DatastreamViewModalContent />);
            await waitFor(() => expect(datastreamOperationValues.viewDatastream).toHaveBeenCalled());
        });
        expect(tree.toJSON()).toMatchSnapshot();
        expect(mockDatatypeContent).not.toHaveBeenCalled();
    });
});
