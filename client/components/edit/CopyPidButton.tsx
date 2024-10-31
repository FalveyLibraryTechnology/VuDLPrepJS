import React from "react";
import ContentCopy from "@mui/icons-material/ContentCopy";

interface CopyPidButtonProps {
    pid: string;
}

const CopyPidButton = ({ pid }: CopyPidButtonProps): React.ReactElement => {
    return (
        <button onClick={() => navigator.clipboard.writeText(pid)}>
            <ContentCopy titleAccess={`Copy PID (${pid}) to clipboard`} />
        </button>
    );
};

export default CopyPidButton;
