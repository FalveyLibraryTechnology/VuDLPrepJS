import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import JobList from "./JobList";

const mockJob = jest.fn();
jest.mock(
    "./Job",
    () =>
        function Job(props) {
            mockJob(props);
            return <mock-job />;
        },
);

describe("JobList", () => {
    let props;

    beforeEach(() => {
        props = {
            category: "testCategory",
            data: ["testJob"],
        };
    });

    it("renders", () => {
        const tree = renderer.create(<JobList {...props} />).toJSON();
        expect(tree).toMatchSnapshot();
        expect(mockJob).toHaveBeenCalledWith(
            expect.objectContaining({
                category: props.category,
                children: "testJob",
            }),
        );
    });
});
