import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import PidRangeIndexer from "./PidRangeIndexer";

const mockUseFetchContext = jest.fn();
jest.mock("../../context/FetchContext", () => ({
    useFetchContext: () => {
        return mockUseFetchContext();
    },
}));

describe("PidRangeIndexer", () => {
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
        const tree = renderer.create(<PidRangeIndexer setResults={setResults} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("submits appropriate JSON", async () => {
        fetchContextValues.action.fetchText.mockResolvedValue("testText");
        render(<PidRangeIndexer setResults={setResults} />);

        fireEvent.change(screen.getByRole("textbox", { name: "Prefix:" }), {
            target: {
                value: "foo:",
            },
        });
        fireEvent.change(screen.getByRole("textbox", { name: "From (number):" }), {
            target: {
                value: "1",
            },
        });
        fireEvent.change(screen.getByRole("textbox", { name: "To (number):" }), {
            target: {
                value: "5",
            },
        });
        await userEvent.setup().click(screen.getByRole("button"));

        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
            expect.stringMatching(/messenger\/queuesolrindex/),
            {
                method: "POST",
                body: '{"prefix":"foo:","to":"5","from":"1"}',
            },
            { "Content-Type": "application/json" },
        );
        expect(setResults).toHaveBeenCalledWith("testText");
    });

    it("throws an error on api call", async () => {
        fetchContextValues.action.fetchText.mockRejectedValue({
            message: "testError",
        });
        render(<PidRangeIndexer setResults={setResults} />);

        await userEvent.setup().click(screen.getByRole("button"));

        expect(fetchContextValues.action.fetchText).toHaveBeenCalled();
        expect(setResults).toHaveBeenCalledWith("testError");
    });
});
