import React from "react";
import { useEditorContext } from "../../../context/EditorContext";
import DatastreamAgentsContent from "./DatastreamAgentsContent";
import DatastreamLicenseContent from "./DatastreamLicenseContent";
import DatastreamUploadContent from "./DatastreamUploadContent";
import DatastreamDublinCoreContent from "./DatastreamDublinCoreContent";
import DatastreamProcessMetadataContent from "./DatastreamProcessMetadataContent";

const uploadModalMapping = {
    LICENSE: <DatastreamLicenseContent />,
    AGENTS: <DatastreamAgentsContent />,
    DC: <DatastreamDublinCoreContent />,
    "PROCESS-MD": <DatastreamProcessMetadataContent />,
};

const DatastreamUploadModalContent = (): React.ReactElement => {
    const {
        state: { activeDatastream },
    } = useEditorContext();

    if (Object.keys(uploadModalMapping).includes(activeDatastream)) {
        return uploadModalMapping[activeDatastream];
    }
    return <DatastreamUploadContent />;
};

export default DatastreamUploadModalContent;
