import React, { useEffect } from "react";
import HtmlReactParser from "html-react-parser";

import styles from "./ObjectSummary.module.css";
import CopyPidButton from "./CopyPidButton";
import { useEditorContext } from "../../context/EditorContext";
import ObjectButtonBar from "./ObjectButtonBar";
import ObjectModels from "./ObjectModels";
import ObjectOrder from "./ObjectOrder";
import ObjectThumbnail from "./ObjectThumbnail";
import ObjectChildCounts from "./ObjectChildCounts";
import { updateRecentPidsCatalog } from "../../util/RecentPidsCatalog";

const ObjectSummary = (): React.ReactElement => {
    const {
        state: { currentPid, objectDetailsStorage },
        action: { extractFirstMetadataValue, loadCurrentObjectDetails },
    } = useEditorContext();

    const loaded = Object.prototype.hasOwnProperty.call(objectDetailsStorage, currentPid);
    const title = !loaded ? "Loading..." : extractFirstMetadataValue("dc:title", "Title not available");

    useEffect(() => {
        if (!loaded) {
            loadCurrentObjectDetails();
        } else {
            // The display of object summary is the easiest way of detecting a "recent view"
            // of a PID, so this is where we update the recent PIDs catalog.
            updateRecentPidsCatalog(currentPid, title);
        }
    }, [currentPid, loaded]);

    const description = extractFirstMetadataValue("dc:description", "");
    return (
        <div className={styles.infobox}>
            <div style={{ float: "right" }}>
                <ObjectThumbnail pid={currentPid} />
                {loaded ? <ObjectModels pid={currentPid} /> : ""}
            </div>
            <h2>{title}</h2>
            <div>{HtmlReactParser(description)}</div>
            {loaded ? <ObjectButtonBar pid={currentPid} /> : ""}
            {loaded ? <ObjectOrder pid={currentPid} /> : ""}
            {loaded ? <ObjectChildCounts pid={currentPid} /> : ""}
            PID: {currentPid} <CopyPidButton pid={currentPid} />
            <br style={{ clear: "both" }} />
        </div>
    );
};

export default ObjectSummary;
