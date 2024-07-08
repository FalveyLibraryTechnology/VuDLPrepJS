import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import SinglePidIndexer from "./SinglePidIndexer";

const mockUseFetchContext = jest.fn();
jest.mock("../../context/FetchContext", () => ({
    useFetchContext: () => {
        return mockUseFetchContext();
    },
}));

describe("SinglePidIndexer", () => {
    let fetchContextValues;
    let setResults;
    beforeEach(() => {
        fetchContextValues = {
            action: {
                fetchText: jest.fn(),
            },
        };
        mockUseFetchContext.mockReturnValue(fetchContextValues);
        setResults = jest.fn();
    });

    it("renders", () => {
        const tree = renderer.create(<SinglePidIndexer setResults={setResults} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("changes the pid input", () => {
        render(<SinglePidIndexer setResults={setResults} />);
        const input = screen.getByRole("textbox");
        fireEvent.change(input, {
            target: {
                value: "testPid",
            },
        });
        expect(input.getAttribute("value")).toEqual("testPid");
    });

    it("fetches the preview text", async () => {
        fetchContextValues.action.fetchText.mockResolvedValue("testText");
        render(<SinglePidIndexer setResults={setResults} />);

        const input = screen.getByRole("textbox");
        fireEvent.change(input, {
            target: {
                value: "testPid",
            },
        });
        await userEvent.setup().click(screen.getByText("Preview"));

        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(expect.stringMatching(/solrindex/), {
            method: "GET",
        });
        expect(setResults).toHaveBeenCalledWith("testText");
    });

    it("fetches the post text", async () => {
        fetchContextValues.action.fetchText.mockResolvedValue("testText");
        render(<SinglePidIndexer setResults={setResults} />);

        const input = screen.getByRole("textbox");
        fireEvent.change(input, {
            target: {
                value: "testPid",
            },
        });
        await userEvent.setup().click(screen.getByText("Index"));

        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(expect.stringMatching(/solrindex/), {
            method: "POST",
        });
        expect(setResults).toHaveBeenCalledWith("testText");
    });

    it("throws an error on api call", async () => {
        fetchContextValues.action.fetchText.mockRejectedValue({
            message: "testError",
        });
        render(<SinglePidIndexer setResults={setResults} />);

        const input = screen.getByRole("textbox");
        fireEvent.change(input, {
            target: {
                value: "testPid",
            },
        });
        await userEvent.setup().click(screen.getByText("Preview"));

        expect(fetchContextValues.action.fetchText).toHaveBeenCalled();
        expect(setResults).toHaveBeenCalledWith("testError");
    });
});
