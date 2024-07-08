import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import { waitFor } from "@testing-library/react";
import renderer from "react-test-renderer";
import DatastreamMetadataModalContent from "./DatastreamMetadataModalContent";

const mockUseDatastreamOperation = jest.fn();
jest.mock("../../../hooks/useDatastreamOperation", () => () => mockUseDatastreamOperation());
const mockDatatypeContent = jest.fn();
jest.mock("../../shared/DatatypeContent", () => (props) => {
    mockDatatypeContent(props);
    return "DatatypeContent: " + JSON.stringify(props);
});
describe("DatastreamMetadataModalContent", () => {
    let datastreamOperationValues;
    let response;
    let data;
    let createObjectURL;
    beforeEach(() => {
        datastreamOperationValues = {
            viewMetadata: jest.fn(),
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
    });

    it("renders", async () => {
        response = {
            data: "test1",
            mimeType: "test2",
        };
        datastreamOperationValues.viewMetadata.mockResolvedValue(response);
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(<DatastreamMetadataModalContent />);
            await waitFor(() => expect(datastreamOperationValues.viewMetadata).toHaveBeenCalled());
        });
        expect(tree.toJSON()).toMatchSnapshot();
        expect(mockDatatypeContent).toHaveBeenCalledWith(response);
    });
});
