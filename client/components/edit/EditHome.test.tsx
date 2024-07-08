import React from "react";
import { describe, expect, it } from "@jest/globals";
import { waitFor } from "@testing-library/react";
import renderer from "react-test-renderer";
import EditHome from "./EditHome";

const mockUseEditorContext = jest.fn();
jest.mock("../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

jest.mock("./children/ChildList", () => () => "ChildList");
jest.mock("./EditorSnackbar", () => () => "EditorSnackbar");
jest.mock("./parents/ParentsModal", () => () => "ParentsModal");
jest.mock("./StateModal", () => () => "StateModal");
jest.mock("./Breadcrumbs", () => () => "Breadcrumbs");

describe("EditHome", () => {
    let editorValues;
    beforeEach(() => {
        editorValues = {
            action: {
                initializeCatalog: jest.fn(),
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
    });
    it("renders", async () => {
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(<EditHome />);

            await waitFor(() => expect(editorValues.action.initializeCatalog).toHaveBeenCalled());
        });

        expect(tree.toJSON()).toMatchSnapshot();
    });
});
