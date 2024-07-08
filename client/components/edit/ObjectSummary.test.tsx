import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import ObjectSummary from "./ObjectSummary";

const mockUseEditorContext = jest.fn();
jest.mock("../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));
jest.mock("./ObjectButtonBar", () => () => "ObjectButtonBar");
jest.mock("./ObjectOrder", () => () => "ObjectOrder");
jest.mock("./ObjectThumbnail", () => () => "ObjectThumbnail");

describe("ObjectSummary", () => {
    let editorValues;
    beforeEach(() => {
        editorValues = {
            state: {
                currentPid: "foo:123",
                objectDetailsStorage: {},
            },
            action: {
                extractFirstMetadataValue: jest.fn(),
                loadCurrentObjectDetails: jest.fn(),
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
    });

    it("displays loading message when appropriate", async () => {
        jest.spyOn(editorValues.action, "extractFirstMetadataValue").mockReturnValue("");
        const loadSpy = jest.spyOn(editorValues.action, "loadCurrentObjectDetails");
        let tree;
        renderer.act(() => {
            tree = renderer.create(<ObjectSummary />);
        });
        expect(tree.toJSON()).toMatchSnapshot();
        expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it("renders information from metadata when available", async () => {
        editorValues.state.objectDetailsStorage["foo:123"] = {
            metadata: {
                "dc:title": ["My title"],
                "dc:description": ["<p>Hello <b>world</b>!</p>"],
            },
        };
        const metaSpy = jest
            .spyOn(editorValues.action, "extractFirstMetadataValue")
            .mockReturnValueOnce("My title")
            .mockReturnValueOnce("<p>Hello <b>world</b>!</p>");
        const tree = renderer.create(<ObjectSummary />).toJSON();
        expect(metaSpy).toHaveBeenCalledTimes(2);
        expect(metaSpy).toHaveBeenNthCalledWith(1, "dc:title", "Title not available");
        expect(metaSpy).toHaveBeenNthCalledWith(2, "dc:description", "");
        expect(tree).toMatchSnapshot();
    });
});
