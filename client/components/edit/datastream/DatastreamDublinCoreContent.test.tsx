import React from "react";
import { describe, afterEach, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import DatastreamDublinCoreContent from "./DatastreamDublinCoreContent";

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

const mockUseDublinCoreMetadataContext = jest.fn();
jest.mock("../../../context/DublinCoreMetadataContext", () => ({
    useDublinCoreMetadataContext: () => {
        return mockUseDublinCoreMetadataContext();
    },
}));

const mockUseDatastreamOperation = jest.fn();
jest.mock("../../../hooks/useDatastreamOperation", () => () => mockUseDatastreamOperation());

jest.mock("./DatastreamDublinCoreValues", () => () => "DatastreamDublinCoreValues");
jest.mock("./DatastreamDublinCoreAddButtons", () => () => "DatastreamDublinCoreAddButtons");
jest.mock("../ObjectPreviewButton", () => () => "ObjectPreviewButton");

describe("DatastreamDublinCoreContent ", () => {
    let dcValues;
    let editorValues;
    let globalValues;
    let pid;
    let uploadDublinCore;

    beforeEach(() => {
        pid = "foo";
        editorValues = {
            state: {
                currentPid: pid,
                objectDetailsStorage: {},
            },
        };
        globalValues = {
            action: {
                closeModal: jest.fn(),
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
        mockUseGlobalContext.mockReturnValue(globalValues);
        uploadDublinCore = jest.fn();
        mockUseDatastreamOperation.mockReturnValue({ uploadDublinCore });
        dcValues = {
            state: {
                currentDublinCore: {},
            },
            action: {
                setCurrentDublinCore: jest.fn(),
            },
        };
        mockUseDublinCoreMetadataContext.mockReturnValue(dcValues);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders", () => {
        const tree = renderer.create(<DatastreamDublinCoreContent />).toJSON();

        expect(tree).toMatchSnapshot();
        // Our default data has nothing loaded, and current DC shouldn't be set
        // until data loads.
        expect(dcValues.action.setCurrentDublinCore).not.toHaveBeenCalled();
    });

    it("correctly loads data", () => {
        const metadata = { "dc:title": ["foo"] };
        editorValues.state.objectDetailsStorage[pid] = { metadata };
        render(<DatastreamDublinCoreContent />);
        expect(dcValues.action.setCurrentDublinCore).toHaveBeenCalledWith(metadata);
    });

    it("correctly defaults to empty data when none is provided", () => {
        editorValues.state.objectDetailsStorage[pid] = {};
        render(<DatastreamDublinCoreContent />);
        expect(dcValues.action.setCurrentDublinCore).toHaveBeenCalledWith({});
    });

    it("correctly uploads data", async () => {
        const metadata = { "dc:title": ["foo"] };
        dcValues.state.currentDublinCore = metadata;
        render(<DatastreamDublinCoreContent />);
        await userEvent.setup().click(screen.getByText("Save"));
        expect(uploadDublinCore).toHaveBeenCalledWith(metadata);
    });

    it("can be canceled", async () => {
        render(<DatastreamDublinCoreContent />);
        await userEvent.setup().click(screen.getByText("Cancel"));
        expect(uploadDublinCore).not.toHaveBeenCalled();
        expect(globalValues.action.closeModal).toHaveBeenCalledWith("datastream");
    });
});
