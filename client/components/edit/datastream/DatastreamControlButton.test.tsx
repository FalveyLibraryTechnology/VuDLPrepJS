import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import { act } from "react-dom/test-utils";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import DatastreamControlButton from "./DatastreamControlButton";

const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));
const mockUseDatastreamOperation = jest.fn();
jest.mock("../../../hooks/useDatastreamOperation", () => () => mockUseDatastreamOperation());
describe("DatastreamControlButton", () => {
    let editorValues;
    let datastreamOperationValues;
    beforeEach(() => {
        editorValues = {
            action: {
                toggleDatastreamModal: jest.fn(),
                setActiveDatastream: jest.fn(),
                setDatastreamModalState: jest.fn(),
            },
        };
        datastreamOperationValues = {
            downloadDatastream: jest.fn(),
        };
        mockUseEditorContext.mockReturnValue(editorValues);
        mockUseDatastreamOperation.mockReturnValue(datastreamOperationValues);
    });

    it("renders", () => {
        const tree = renderer.create(<DatastreamControlButton modalState="Upload" datastream="THUMBNAIL" />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("downloads the datastream", async () => {
        await act(async () => {
            render(<DatastreamControlButton modalState="Download" datastream="THUMBNAIL" />);
        });
        await userEvent.setup().click(screen.getByRole("button"));
        expect(datastreamOperationValues.downloadDatastream).toHaveBeenCalledWith("THUMBNAIL");
    });

    it("activates the modal", async () => {
        await act(async () => {
            render(<DatastreamControlButton modalState="View" datastream="THUMBNAIL" />);
        });
        await userEvent.setup().click(screen.getByRole("button"));
        expect(editorValues.action.setActiveDatastream).toHaveBeenCalledWith("THUMBNAIL");
        expect(editorValues.action.setDatastreamModalState).toHaveBeenCalledWith("View");
        expect(editorValues.action.toggleDatastreamModal).toHaveBeenCalled();
    });
});
