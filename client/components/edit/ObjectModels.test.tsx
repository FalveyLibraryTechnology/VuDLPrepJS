import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import ObjectModels from "./ObjectModels";

const mockUseEditorContext = jest.fn();
jest.mock("../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

describe("ObjectModels", () => {
    let editorValues;
    beforeEach(() => {
        editorValues = {
            state: {
                objectDetailsStorage: {},
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
    });

    it("renders models", async () => {
        editorValues.state.objectDetailsStorage["foo:123"] = {
            models: ["vudl-system:CoreModel", "vudl-system:CollectionModel", "vudl-system:FolderCollection"],
        };
        const tree = renderer.create(<ObjectModels pid="foo:123" />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders nothing when data is missing", async () => {
        const tree = renderer.create(<ObjectModels pid="foo:123" />).toJSON();
        expect(tree).toMatchSnapshot();
    });
});
