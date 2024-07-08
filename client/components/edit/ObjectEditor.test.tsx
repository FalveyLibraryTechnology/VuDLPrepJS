import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import ObjectEditor from "./ObjectEditor";

const mockUseEditorContext = jest.fn();
jest.mock("../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));
jest.mock("./children/ChildList", () => () => "ChildList");
jest.mock("./Breadcrumbs", () => () => "Breadcrumbs");
jest.mock("./datastream/DatastreamList", () => () => "DatastreamList");
jest.mock("./datastream/DatastreamModal", () => () => "DatastreamModal");
jest.mock("./ObjectSummary", () => () => "ObjectSummary");
jest.mock("./EditorSnackbar", () => () => "EditorSnackbar");
jest.mock("./parents/ParentsModal", () => () => "ParentsModal");
jest.mock("./StateModal", () => () => "StateModal");

describe("ObjectEditor", () => {
    let editorValues;
    beforeEach(() => {
        editorValues = {
            action: {
                initializeCatalog: jest.fn(),
                setCurrentPid: jest.fn(),
                loadCurrentObjectDetails: jest.fn(),
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
    });
    it("renders", () => {
        const tree = renderer.create(<ObjectEditor pid="foo:123" />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("calls initializeCatalog", () => {
        renderer.act(() => {
            renderer.create(<ObjectEditor pid="foo:123" />);
        });
        expect(editorValues.action.initializeCatalog).toHaveBeenCalled();
        expect(editorValues.action.setCurrentPid).toHaveBeenCalledWith("foo:123");
        expect(editorValues.action.loadCurrentObjectDetails).toHaveBeenCalled();
    });
});
