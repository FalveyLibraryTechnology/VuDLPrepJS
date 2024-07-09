import React, { useState, useEffect } from "react";

import Category from "./Category";
import { ingestApiUrl } from "../../util/routes";

import { useFetchContext } from "../../context/FetchContext";
import BasicBreadcrumbs from "../shared/BasicBreadcrumbs";

const JobSelector = (): React.ReactElement => {
    const {
        action: { fetchJSON },
    } = useFetchContext();
    const [categoryComponents, setCategoryComponents] = useState([[], []]);

    const injestApi = async () => {
        try {
            const data = await fetchJSON(ingestApiUrl);
            setCategoryComponents(
                Object.values(data).reduce(
                    (categoryComponents, category) => {
                        categoryComponents[category.jobs.length > 0 ? 0 : 1].push(
                            <Category key={category.category} data={category} />,
                        );
                        return categoryComponents;
                    },
                    [[], []],
                ),
            );
        } catch (error) {
            console.error(error);
        }
    };
    useEffect(() => {
        injestApi();
    }, []);

    return (
        <>
            <BasicBreadcrumbs />
            <div id="jobSelector">{[...categoryComponents[0], ...categoryComponents[1]]}</div>
        </>
    );
};

export default JobSelector;
