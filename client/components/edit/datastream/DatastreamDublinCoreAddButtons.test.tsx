import React from "react";
import { describe, afterEach, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import DatastreamDublinCoreAddButtons from "./DatastreamDublinCoreAddButtons";
import { waitFor } from "@testing-library/react";

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

jest.mock("../PidPicker", () => (props) => "PidPicker: " + JSON.stringify(props));

describe("DatastreamDublinCoreAddButtons", () => {
    let dcValues;
    let editorValues;
    const pid = "foo:123";

    beforeEach(() => {
        editorValues = {
            state: {
                currentPid: pid,
                dublinCoreFieldCatalog: {
                    "dc:identifier": { type: "locked" },
                    "dc:title": { type: "text" },
                    "dc:description": { type: "html" },
                },
                objectDetailsStorage: {},
                parentDetailsStorage: {},
            },
            action: {
                loadObjectDetailsIntoStorage: jest.fn(),
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
        dcValues = {
            action: {
                addValueAbove: jest.fn(),
                mergeValues: jest.fn(),
            },
        };
        mockUseDublinCoreMetadataContext.mockReturnValue(dcValues);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders without selected clone pid", () => {
        const tree = renderer.create(<DatastreamDublinCoreAddButtons />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders with selected clone pid", () => {
        editorValues.state.objectDetailsStorage["foo"] = {};
        const tree = renderer.create(<DatastreamDublinCoreAddButtons />);
        renderer.act(() => {
            tree.root.children[4].props.setSelected("foo");
        });
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("renders with appropriate parent details (using shallow storage)", () => {
        editorValues.state.parentDetailsStorage[pid] = {
            shallow: {
                parents: [{ pid: "parent:123", title: "Parent" }],
            },
        };
        const tree = renderer.create(<DatastreamDublinCoreAddButtons />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders with appropriate parent details (using full storage)", () => {
        editorValues.state.parentDetailsStorage[pid] = {
            full: {
                parents: [{ pid: "parent:123", title: "Parent" }],
            },
        };
        const tree = renderer.create(<DatastreamDublinCoreAddButtons />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("adds new fields on click", () => {
        const tree = renderer.create(<DatastreamDublinCoreAddButtons />);
        renderer.act(() => {
            tree.root.findAllByType("button")[1].props.onClick();
        });
        expect(dcValues.action.addValueAbove).toHaveBeenCalledWith("dc:description", 0, "");
    });

    it("loads details for cloned pids", async () => {
        const tree = renderer.create(<DatastreamDublinCoreAddButtons />);
        await renderer.act(async () => {
            tree.root.children[4].props.setSelected("foo");
            await waitFor(() => expect(editorValues.action.loadObjectDetailsIntoStorage).toHaveBeenCalled());
        });
        expect(editorValues.action.loadObjectDetailsIntoStorage).toHaveBeenCalledWith("foo", expect.anything());
    });

    it("clones metadata", () => {
        editorValues.state.objectDetailsStorage["foo"] = {
            metadata: { "dc:identifier": ["foo"], "dc:title": ["added"], "dc:description": ["bar"] },
        };
        const tree = renderer.create(<DatastreamDublinCoreAddButtons />);
        renderer.act(() => {
            tree.root.children[4].props.setSelected("foo");
        });
        renderer.act(() => {
            tree.root.findAllByType("button")[2].props.onClick();
        });
        expect(dcValues.action.mergeValues).toHaveBeenCalledWith({
            "dc:title": ["added"],
            "dc:description": ["bar"],
        });
    });
});
