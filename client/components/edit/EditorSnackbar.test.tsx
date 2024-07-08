import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import EditorSnackbar from "./EditorSnackbar";

const mockUseGlobalContext = jest.fn();
jest.mock("../../context/GlobalContext", () => ({
    useGlobalContext: () => {
        return mockUseGlobalContext();
    },
}));
jest.mock("./children/ChildList", () => () => "ChildList");

describe("EditorSnackbar", () => {
    let globalValues;
    beforeEach(() => {
        globalValues = {
            state: {
                snackbarState: {
                    message: "test1",
                    open: true,
                    severity: "info",
                },
            },
            action: {
                setSnackbarState: jest.fn(),
            },
        };
        mockUseGlobalContext.mockReturnValue(globalValues);
    });

    it("renders", () => {
        const tree = renderer
            .create(<EditorSnackbar />, {
                createNodeMock: (node: Node) => {
                    return document.createElement(node.type);
                },
            })
            .toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("closes", async () => {
        render(<EditorSnackbar />);

        await userEvent.setup().click(screen.getByRole("button"));

        expect(globalValues.action.setSnackbarState).toHaveBeenCalledWith({
            open: false,
            message: "",
            severity: "info",
        });
    });
});
