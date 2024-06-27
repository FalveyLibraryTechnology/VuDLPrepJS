import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act } from "react-dom/test-utils";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import PdfGenerator from "./PdfGenerator";

const mockUseFetchContext = jest.fn();
jest.mock("../../context/FetchContext", () => ({
    useFetchContext: () => {
        return mockUseFetchContext();
    },
}));
jest.mock("../shared/BasicBreadcrumbs", () => () => "BasicBreadcrumbs");

describe("PdfGenerator", () => {
    let fetchContextValues;
    beforeEach(() => {
        fetchContextValues = {
            action: {
                fetchText: jest.fn(),
            },
        };
        mockUseFetchContext.mockReturnValue(fetchContextValues);
    });

    it("renders", () => {
        const tree = renderer.create(<PdfGenerator />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("changes the pid input", () => {
        render(<PdfGenerator />);
        const input = screen.getByRole("textbox");
        fireEvent.change(input, {
            target: {
                value: "testPid",
            },
        });
        expect(input.getAttribute("value")).toEqual("testPid");
    });

    it("fetches the text", async () => {
        fetchContextValues.action.fetchText.mockResolvedValue("testText");

        render(<PdfGenerator />);
        const input = screen.getByRole("textbox");
        fireEvent.change(input, {
            target: {
                value: "testPid",
            },
        });
        await act(async () => { userEvent.setup().click(screen.getByRole("button")); });
        await waitFor(() => expect(fetchContextValues.action.fetchText).toHaveBeenCalled());
        expect(screen.queryAllByText("testText")).toHaveLength(1);
    });

    it("throws an error on api call", async () => {
        fetchContextValues.action.fetchText.mockRejectedValue({
            message: "testError",
        });

        render(<PdfGenerator />);
        const input = screen.getByRole("textbox");
        fireEvent.change(input, {
            target: {
                value: "testPid",
            },
        });
        await act(async () => { userEvent.setup().click(screen.getByRole("button")) });
        await waitFor(() => expect(fetchContextValues.action.fetchText).toHaveBeenCalled());
        expect(screen.queryAllByText("testError")).toHaveLength(1);
    });
});
