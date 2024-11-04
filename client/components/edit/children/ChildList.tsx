import styles from "./ChildList.module.css";
import React, { useEffect, useState } from "react";
import { useEditorContext } from "../../../context/EditorContext";
import Child from "./Child";
import SelectableChild from "./SelectableChild";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Pagination from "@mui/material/Pagination";

export interface ChildListProps {
    pid?: string;
    selectCallback?: boolean | ((pid: string) => void);
    pageSize?: number;
    forceChildCounts?: boolean | null;
    forceModels?: boolean | null;
    forceThumbs?: boolean | null;
}

export const ChildList = ({
    pid = "",
    selectCallback = false,
    pageSize = 10,
    forceChildCounts = null,
    forceModels = null,
    forceThumbs = null,
}: ChildListProps): React.ReactElement => {
    const {
        state: { childListStorage },
        action: { getChildListStorageKey, loadChildrenIntoStorage },
    } = useEditorContext();
    // Use session storage to remember the last page viewed across pages/history:
    const pageStorageKey = "child_page_" + pid;
    const initialPage: string | null =
        typeof sessionStorage !== "undefined" ? sessionStorage.getItem(pageStorageKey) : null;
    const [page, setPage] = useState<number>(parseInt(initialPage ?? "1"));
    if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(pageStorageKey, page.toString());
    }
    const [showChildCounts, setShowChildCounts] = useState<boolean>(false);
    const [showModels, setShowModels] = useState<boolean>(false);
    const [showThumbs, setShowThumbs] = useState<boolean>(false);
    const key = getChildListStorageKey(pid, page, pageSize);
    const loaded = Object.prototype.hasOwnProperty.call(childListStorage, key);
    useEffect(() => {
        if (!loaded) {
            loadChildrenIntoStorage(pid, page, pageSize);
        }
    }, [loaded]);
    if (!loaded) {
        return (
            <p>
                <CircularProgress size="1em" /> Loading...
            </p>
        );
    }
    const children = childListStorage[key];
    const childDocs = children.docs;
    const buttonStyles = { float: "right", marginTop: "-2em" };
    const childButton =
        forceChildCounts === null ? (
            <button
                style={buttonStyles}
                onClick={() => {
                    setShowChildCounts(!showChildCounts);
                }}
            >
                {showChildCounts ? "Hide Child Counts" : "Show Child Counts"}
            </button>
        ) : null;
    const modelsButton =
        forceModels === null ? (
            <button
                style={buttonStyles}
                onClick={() => {
                    setShowModels(!showModels);
                }}
            >
                {showModels ? "Hide Models" : "Show Models"}
            </button>
        ) : null;
    const thumbsButton =
        forceThumbs === null ? (
            <button
                style={buttonStyles}
                onClick={() => {
                    setShowThumbs(!showThumbs);
                }}
            >
                {showThumbs ? "Hide Thumbnails" : "Show Thumbnails"}
            </button>
        ) : null;
    const contents = childDocs.map((child: Record<string, string>) => {
        return (
            <li key={`${pid}_child_${child.id}`}>
                {selectCallback === false ? (
                    <Child
                        pid={child.id}
                        parentPid={pid}
                        initialTitle={child.title ?? "-"}
                        thumbnail={forceThumbs ?? showThumbs}
                        models={forceModels ?? showModels}
                        showChildCounts={forceChildCounts ?? showChildCounts}
                    />
                ) : (
                    <SelectableChild
                        pid={child.id}
                        selectCallback={selectCallback}
                        initialTitle={child.title ?? "-"}
                        thumbnail={forceThumbs ?? showThumbs}
                    />
                )}
            </li>
        );
    });
    const pageCount = Math.ceil(children.numFound / pageSize);
    const paginator =
        pageCount > 1 ? (
            <Pagination
                count={pageCount}
                page={page}
                siblingCount={2}
                boundaryCount={2}
                onChange={(e, page) => {
                    setPage(page);
                }}
            />
        ) : (
            ""
        );
    const startNumber = (page - 1) * pageSize + 1;
    const endNumber = startNumber + pageSize - 1;
    const paginatorLabel =
        children.numFound > 1 ? (
            <p>
                Showing {startNumber} - {children.numFound < endNumber ? children.numFound : endNumber} of{" "}
                {children.numFound}
            </p>
        ) : null;
    return (
        <div className={styles.childlist}>
            <Grid container sx={{ spacing: 2, alignItems: "center" }}>
                <Grid item xs="auto">
                    {thumbsButton}
                </Grid>
                <Grid item xs="auto">
                    {modelsButton}
                </Grid>
                <Grid item xs="auto">
                    {childButton}
                </Grid>
                <Grid item xs="auto">
                    {paginatorLabel}
                </Grid>
                <Grid item xs="auto">
                    {paginator}
                </Grid>
            </Grid>
            <ul className={styles.childlist__list}>{contents.length ? contents : <em>Empty.</em>}</ul>
        </div>
    );
};

export default ChildList;
