import React from "react";
import { describe, afterEach, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import DatastreamDublinCoreValues from "./DatastreamDublinCoreValues";

jest.mock("./DatastreamDublinCoreFieldGroup", () => (props) => {
    // Mock the field group so it just returns the value of its field property:
    return props.field;
});

const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

const mockUseDublinCoreMetadataContext = jest.fn();
jest.mock("../../../context/DublinCoreMetadataContext", () => ({
    useDublinCoreMetadataContext: () => {
        return mockUseDublinCoreMetadataContext();
    },
}));

describe("DatastreamDublinCoreValues", () => {
    let dcValues;
    let editorValues;

    beforeEach(() => {
        editorValues = {
            state: {
                dublinCoreFieldCatalog: {
                    "dc:identifier": { type: "locked" },
                    "dc:title": { type: "text" },
                    "dc:description": { type: "html" },
                },
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
        dcValues = {
            state: {
                currentDublinCore: {
                    "dc:identifier": ["foo"],
                    "dc:title": ["bar", "baz"],
                },
            },
        };
        mockUseDublinCoreMetadataContext.mockReturnValue(dcValues);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders a field group for each field type in the current Dublin Core", () => {
        const tree = renderer.create(<DatastreamDublinCoreValues />).toJSON();
        expect(tree).toEqual(["dc:identifier", "dc:title"]);
    });
});
