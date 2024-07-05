import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import EditParentsButton from "./EditParentsButton";

const mockUseEditorContext = jest.fn();
jest.mock("../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

const mockUseGlobalContext = jest.fn();
jest.mock("../../context/GlobalContext", () => ({
    useGlobalContext: () => {
        return mockUseGlobalContext();
    },
}));

describe("EditParentsButton", () => {
    let editorValues;
    let globalValues;
    let pid: string;
    beforeEach(() => {
        pid = "foo:123";
        editorValues = {
            action: {
                setParentsModalActivePid: jest.fn(),
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
        globalValues = {
            action: {
                openModal: jest.fn(),
            },
        };
        mockUseGlobalContext.mockReturnValue(globalValues);
    });

    it("renders", () => {
        const tree = renderer.create(<EditParentsButton pid={pid} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("sets up modal on click", async () => {
        render(<EditParentsButton pid={pid} />);
        await userEvent.setup().click(screen.getByRole("button"));

        expect(editorValues.action.setParentsModalActivePid).toHaveBeenCalledWith(pid);
        expect(globalValues.action.openModal).toHaveBeenCalledWith("parents");
    });
});
