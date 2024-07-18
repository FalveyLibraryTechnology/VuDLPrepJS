import React from "react";
import renderer from "react-test-renderer";
import CopyPidButton from "./CopyPidButton";

describe("CopyPidButton", () => {
    it("renders", async () => {
        const tree = renderer.create(<CopyPidButton pid="foo" />);
        expect(tree.toJSON()).toMatchSnapshot();
    });
});
