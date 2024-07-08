import React from "react";
import { describe, afterEach, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import DatastreamDublinCoreFieldGroup from "./DatastreamDublinCoreFieldGroup";

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

jest.mock("@mui/material/Grid", () => (props) => props.children);
jest.mock("@mui/icons-material/AddCircle", () => (props) => props.titleAccess);
jest.mock("@mui/icons-material/Delete", () => (props) => props.titleAccess);

describe("DatastreamDublinCoreFieldGroup", () => {
    let dcValues;
    let editorValues;

    beforeEach(() => {
        editorValues = {
            state: {
                dublinCoreFieldCatalog: {
                    "dc:identifier": { type: "locked" },
                    "dc:title": { type: "text" },
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
                keyCounter: {},
            },
            action: {
                addValueBelow: jest.fn(),
                deleteValue: jest.fn(),
                replaceValue: jest.fn(),
            },
        };
        mockUseDublinCoreMetadataContext.mockReturnValue(dcValues);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders unlocked fields", () => {
        const tree = renderer.create(<DatastreamDublinCoreFieldGroup field="dc:title" />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders locked fields", () => {
        const tree = renderer.create(<DatastreamDublinCoreFieldGroup field="dc:identifier" />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("inserts values below", () => {
        const tree = renderer.create(<DatastreamDublinCoreFieldGroup field="dc:title" />);
        const buttons = tree.root.findAllByType("button");
        renderer.act(() => {
            expect(buttons[2].children[0].props.titleAccess).toEqual("Add Below");
            buttons[2].props.onClick();
        });
        expect(dcValues.action.addValueBelow).toHaveBeenCalledWith("dc:title", 1, "");
    });

    it("deletes rows", () => {
        const tree = renderer.create(<DatastreamDublinCoreFieldGroup field="dc:title" />);
        const buttons = tree.root.findAllByType("button");
        renderer.act(() => {
            expect(buttons[1].children[0].props.titleAccess).toEqual("Delete Row");
            buttons[1].props.onClick();
        });
        expect(dcValues.action.deleteValue).toHaveBeenCalledWith("dc:title", 0);
    });

    it("saves values appropriately", () => {
        const tree = renderer.create(<DatastreamDublinCoreFieldGroup field="dc:title" />);
        const inputs = tree.root.findAllByType("input");
        inputs[1].props.onBlur({ target: { value: "xyzzy" } });
        expect(dcValues.action.replaceValue).toHaveBeenCalledWith("dc:title", 1, "xyzzy");
    });
});
