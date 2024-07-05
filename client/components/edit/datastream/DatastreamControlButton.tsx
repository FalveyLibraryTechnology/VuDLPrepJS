import React, { useState } from "react";
import LoadingButton from "@mui/lab/LoadingButton";
import Tooltip from "@mui/material/Tooltip";
import DataObject from "@mui/icons-material/DataObject";
import Download from "@mui/icons-material/Download";
import Delete from "@mui/icons-material/Delete";
import Preview from "@mui/icons-material/Preview";
import UploadFile from "@mui/icons-material/UploadFile";
import { useEditorContext } from "../../../context/EditorContext";
import { useGlobalContext } from "../../../context/GlobalContext";
import useDatastreamOperation from "../../../hooks/useDatastreamOperation";

const Icons = {
    Upload: <UploadFile />,
    View: <Preview />,
    Metadata: <DataObject />,
    Download: <Download />,
    Delete: <Delete />,
};

interface DatastreamControlButtonProps {
    modalState: string;
    datastream: string;
    disabled: boolean;
}

const DatastreamControlButton = ({
    modalState,
    datastream,
    disabled,
}: DatastreamControlButtonProps): React.ReactElement => {
    const [isLoading, setLoading] = useState(false);
    const {
        action: { setActiveDatastream, setDatastreamModalState },
    } = useEditorContext();
    const {
        action: { openModal },
    } = useGlobalContext();
    const { downloadDatastream } = useDatastreamOperation();
    const onClick = (modalState) => {
        if (modalState !== "Download") {
            return () => {
                setActiveDatastream(datastream);
                setDatastreamModalState(modalState);
                openModal("datastream");
            };
        }
        return async () => {
            setLoading(true);
            await downloadDatastream(datastream);
            setLoading(false);
        };
    };
    return (
        <Tooltip title={modalState}>
            <span>
                <LoadingButton
                    className="datastreamControlButton"
                    loading={isLoading}
                    aria-label={modalState}
                    disabled={modalState !== "Upload" && disabled}
                    onClick={onClick(modalState)}
                    size="small"
                >
                    {Icons[modalState]}
                </LoadingButton>
            </span>
        </Tooltip>
    );
};

export default DatastreamControlButton;
