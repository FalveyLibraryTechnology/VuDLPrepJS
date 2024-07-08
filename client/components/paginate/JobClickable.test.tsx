import React from "react";
import { beforeEach, describe, expect, it } from "@jest/globals";
import renderer from "react-test-renderer";
import JobClickable from "./JobClickable";

describe("JobClickable", () => {
    let props;
    beforeEach(() => {
        props = {
            category: "testCategory",
            children: "testChildren",
            clickable: true,
            clickWarning: "testWarning",
        };
    });

    it("renders", () => {
        const tree = renderer.create(<JobClickable {...props} />).toJSON();
        expect(tree).toMatchSnapshot();
    });
});
