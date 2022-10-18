import styles from "./ObjectSummary.module.css";
import React, { useEffect } from "react";
import HtmlReactParser from "html-react-parser";
import { useEditorContext } from "../../context/EditorContext";
import ObjectButtonBar from "./ObjectButtonBar";
import ObjectThumbnail from "./ObjectThumbnail";

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
            <ObjectThumbnail pid={currentPid} />
            <h2>{title}</h2>
            <div>{HtmlReactParser(description)}</div>
            {loaded ? <ObjectButtonBar pid={currentPid} /> : ""}
            <br style={{ clear: "both" }} />
        </div>
    );
};

export default ObjectSummary;
