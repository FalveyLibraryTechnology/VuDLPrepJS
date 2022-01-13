import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useFetchContext } from "../FetchContext";
import { apiUrl } from "../routes";
import { Link } from "react-router-dom";

/* TODO: use this interface when we convert to Typescript:
interface TreeData {
    topNodes: Array<string>,
    records: Record<string, Record<string, string>>,
    childLookups: Record<string, Array<string>>,
}
 */

const Breadcrumbs = ({ pid = null }) => {
    const {
        action: { fetchJSON },
    } = useFetchContext();
    const [treeData, setTreeData] = useState([]);

    /**
     * Analyze the raw breadcrumb data, identifying top-level nodes (i.e. nodes with
     * no parents) and creating lookup tables for children. This makes it easier to
     * render breadcrumbs from left to right and to find all relevant trails.
     */
    function processBreadcrumbData(data) {
        const queue = [data];
        const topNodes = [];
        const childLookups = {};
        const records = {};
        while (queue.length > 0) {
            const current = queue.shift();
            if (current.parents.length === 0) {
                topNodes.push(current.pid);
            }
            records[current.pid] = { pid: current.pid, title: current.title };
            current.parents.forEach((parent) => {
                queue.push(parent);
                if (typeof childLookups[parent.pid] === "undefined") {
                    childLookups[parent.pid] = [current.pid];
                } else {
                    childLookups[parent.pid].push(current.pid);
                }
            });
        }
        return {
            topNodes: [...new Set(topNodes)], // deduplicate
            records,
            childLookups,
        };
    }

    useEffect(() => {
        async function loadData() {
            let data = [];
            const url = apiUrl + "/edit/breadcrumbs" + (pid === null ? "" : "/" + pid);
            try {
                data = processBreadcrumbData(await fetchJSON(url));
            } catch (e) {
                console.error("Problem fetching breadcrumb data from " + url);
            }
            setTreeData(data);
        }
        loadData();
    }, []);

    function generateBreadcrumbTrails(treeData, pid) {
        // BFS from top (root id) to target pid
        const queue = [];
        (treeData.topNodes ?? []).forEach((rootId) => {
            queue.push({
                pid: rootId,
                path: [],
            });
        });
        const result = [];
        while (queue.length > 0) {
            const current = queue.shift();
            const record = treeData.records[current.pid] ?? {};
            const path = current.path;
            path.push(record);
            (treeData.childLookups[current.pid] ?? []).forEach((childPid) => {
                // At target
                if (childPid === pid) {
                    result.push(path);
                } else {
                    // Add to queue for more
                    queue.push({
                        pid: childPid,
                        path: [...path], // clone array to avoid multiple references to the same array
                    });
                }
            });
        }
        return result;
    }

    const allTrails = generateBreadcrumbTrails(treeData, pid);
    const contents = allTrails.map((trail, trailIndex) => {
        const breadcrumbs = trail.map((breadcrumb) => {
            return (
                <li key={(breadcrumb.pid ?? "root") + "_" + trailIndex}>
                    <Link to={"/edit/object/" + breadcrumb.pid}>{breadcrumb.title}</Link>
                </li>
            );
        });
        return <ul key={"breadcrumbs" + "_" + trailIndex}>{breadcrumbs}</ul>;
    });
    return <>{contents}</>;
};

Breadcrumbs.propTypes = {
    pid: PropTypes.string,
};

export default Breadcrumbs;
