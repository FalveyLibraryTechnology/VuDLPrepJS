import React, { useState } from "react";
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

export interface ChildProps {
    pid: string;
    parentPid?: string;
    initialTitle: string;
    thumbnail?: boolean;
}

export const Child = ({ pid, parentPid = "", initialTitle, thumbnail = false }: ChildProps): React.ReactElement => {
    const {
        state: { objectDetailsStorage },
    } = useEditorContext();
    const [expanded, setExpanded] = useState<boolean>(false);
    const loaded = Object.prototype.hasOwnProperty.call(objectDetailsStorage, pid);
    const details = loaded ? objectDetailsStorage[pid] : {};

    const title = !loaded ? initialTitle : extractFirstMetadataValue(details?.metadata ?? {}, "dc:title", "-");
    const expandControl = (
        <span onClick={() => setExpanded(!expanded)}>
            {expanded ? <IndeterminateCheckBox titleAccess="Collapse Tree" /> : <AddBox titleAccess="Expand Tree" />}
        </span>
    );
    const childList = expanded ? <ChildList pid={pid} pageSize={10} forceThumbs={thumbnail} /> : "";
    const thumbnailDisplay = thumbnail ? (
        <Grid item xs={1}>
            <ObjectThumbnail pid={pid} />
        </Grid>
    ) : null;
    return (
        <>
            <Grid container>
                <Grid item xs={thumbnail ? 7 : 8}>
                    {expandControl}
                    {loaded && parentPid ? <ChildPosition pid={pid} parentPid={parentPid} /> : ""}
                    <Link href={"/edit/object/" + pid}>{(title.length > 0 ? title : "-") + ` [${pid}]`}</Link>{" "}
                    <CopyPidButton pid={pid} />
                </Grid>
                <Grid item xs={4}>
                    {loaded ? <ObjectButtonBar pid={pid} /> : ""}
                    <ObjectLoader pid={pid} />
                </Grid>
                {thumbnailDisplay}
            </Grid>
            {childList}
        </>
    );
};

export default Child;
