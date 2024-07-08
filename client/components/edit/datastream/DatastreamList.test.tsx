import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import DatastreamList from "./DatastreamList";

const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));
const mockDatastream = jest.fn();
jest.mock("./Datastream", () => (props) => {
    mockDatastream(props);
    return "Datastream: " + JSON.stringify(props);
});

describe("DatastreamList", () => {
    let editorValues;
    beforeEach(() => {
        editorValues = {
            state: {
                modelsDatastreams: [
                    { stream: "test1", disabled: true },
                    { stream: "test0", disabled: false },
                ],
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
    });

    it("renders", () => {
        const tree = renderer.create(<DatastreamList />).toJSON();
        expect(tree).toMatchSnapshot();
        expect(mockDatastream).toHaveBeenCalledWith({
            datastream: { stream: "test0", disabled: false },
        });
        expect(mockDatastream).toHaveBeenCalledWith({
            datastream: { stream: "test1", disabled: true },
        });
    });
});
