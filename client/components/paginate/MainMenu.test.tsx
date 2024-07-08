import React from "react";
import { describe, expect, it } from "@jest/globals";
import renderer from "react-test-renderer";
import MainMenu from "./MainMenu";

describe("MainMenu", () => {
    it("renders", () => {
        const tree = renderer.create(<MainMenu />).toJSON();
        expect(tree).toMatchSnapshot();
    });
});
