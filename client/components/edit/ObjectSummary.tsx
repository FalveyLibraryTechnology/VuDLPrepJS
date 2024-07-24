import styles from "./ObjectSummary.module.css";
import CopyPidButton from "./CopyPidButton";
import React, { useEffect } from "react";
import HtmlReactParser from "html-react-parser";
import { useEditorContext } from "../../context/EditorContext";
import ObjectButtonBar from "./ObjectButtonBar";
import ObjectModels from "./ObjectModels";
import ObjectOrder from "./ObjectOrder";
import ObjectThumbnail from "./ObjectThumbnail";
import ObjectChildCounts from "./ObjectChildCounts";

const ObjectSummary = (): React.ReactElement => {
    const {
        state: { currentPid, objectDetailsStorage },
        action: { extractFirstMetadataValue, loadCurrentObjectDetails },
    } = useEditorContext();

    const loaded = Object.prototype.hasOwnProperty.call(objectDetailsStorage, currentPid);

    useEffect(() => {
        if (!loaded) {
            loadCurrentObjectDetails();
        }
    }, [currentPid, loaded]);

    const title = !loaded ? "Loading..." : extractFirstMetadataValue("dc:title", "Title not available");
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
