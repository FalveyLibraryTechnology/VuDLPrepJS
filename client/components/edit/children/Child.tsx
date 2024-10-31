import React, { useState } from "react";

import styles from "./ChildList.module.css";

import { useEditorContext } from "../../../context/EditorContext";
import ChildList from "./ChildList";
import ChildPosition from "./ChildPosition";
import Grid from "@mui/material/Grid";
import Link from "next/link";
import AddBox from "@mui/icons-material/AddBox";
import IndeterminateCheckBox from "@mui/icons-material/IndeterminateCheckBox";
import { extractFirstMetadataValue } from "../../../util/metadata";
import ObjectLoader from "../ObjectLoader";
import ObjectButtonBar from "../ObjectButtonBar";
import ObjectThumbnail from "../ObjectThumbnail";
import CopyPidButton from "../CopyPidButton";
import ObjectChildCounts from "../ObjectChildCounts";
import ObjectModels from "../ObjectModels";

export interface ChildProps {
    pid: string;
    parentPid?: string;
    initialTitle: string;
    thumbnail?: boolean;
    models?: boolean;
    showChildCounts?: boolean;
}

export const Child = ({
    pid,
    parentPid = "",
    initialTitle,
    thumbnail = false,
    models = false,
    showChildCounts = false,
}: ChildProps): React.ReactElement => {
    const {
        state: { objectDetailsStorage },
    } = useEditorContext();
    const [expanded, setExpanded] = useState<boolean>(false);
    const loaded = Object.prototype.hasOwnProperty.call(
        objectDetailsStorage,
        pid,
    );
    const details = loaded ? objectDetailsStorage[pid] : {};

    const title = !loaded
        ? initialTitle
        : extractFirstMetadataValue(details?.metadata ?? {}, "dc:title", "-");
    const expandControl = (
        <span onClick={() => setExpanded(!expanded)}>
            {expanded ? (
                <IndeterminateCheckBox
                    titleAccess="Collapse Tree"
                    className={styles.childlist__expandicon}
                />
            ) : (
                <AddBox
                    titleAccess="Expand Tree"
                    className={styles.childlist__expandicon}
                />
            )}
        </span>
    );
    const childList = expanded ? (
        <ChildList
            pid={pid}
            pageSize={10}
            forceChildCounts={showChildCounts}
            forceModels={models}
            forceThumbs={thumbnail}
        />
    ) : null;
    const hasExtraTools = thumbnail || models || showChildCounts;
    const extraTools = hasExtraTools ? (
        <Grid item>
            {thumbnail ? <ObjectThumbnail pid={pid} /> : ""}
            {showChildCounts ? <ObjectChildCounts pid={pid} /> : ""}
            {models ? <ObjectModels pid={pid} /> : ""}
        </Grid>
    ) : null;
    return (
        <div className={styles.childlist__item}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs>
                    {expandControl}{" "}
                    {loaded && parentPid ? (
                        <ChildPosition pid={pid} parentPid={parentPid} />
                    ) : (
                        ""
                    )}
                    <Link href={"/edit/object/" + pid}>{title || "(no title)"}</Link>
                </Grid>
                <Grid item xs={1} className={styles.childlist__pid}>
                    {pid}
                </Grid>
                <Grid item xs={1}>
                    <CopyPidButton pid={pid} />
                </Grid>
                <Grid item xs="auto" style={{textAlign:"right"}}>
                    {loaded ? <ObjectButtonBar pid={pid} /> : ""}
                    <ObjectLoader pid={pid} />
                </Grid>
                {extraTools}
            </Grid>
            {childList}
        </div>
    );
};

export default Child;
