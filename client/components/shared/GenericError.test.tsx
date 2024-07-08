import React from "react";
import { describe, expect, it } from "@jest/globals";
import renderer from "react-test-renderer";
import GenericError from "./GenericError";

describe("GenericError", () => {
    it("renders", () => {
        const message = "Test error";
        const tree = renderer.create(<GenericError message={message} />).toJSON();
        expect(tree).toMatchSnapshot();
        expect(JSON.stringify(tree).includes(message)).toBeTruthy();
    });
});
