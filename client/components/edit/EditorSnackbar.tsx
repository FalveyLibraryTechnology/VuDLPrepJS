import React from "react";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import CloseIcon from "@mui/icons-material/Close";
import { useGlobalContext } from "../../context/GlobalContext";

const EditorSnackbar = (): React.ReactElement => {
    const {
        state: {
            snackbarState: { message, open, severity },
        },
        action: { setSnackbarState },
    } = useGlobalContext();

    const handleClose = () => {
        setSnackbarState({
            open: false,
            message: "",
            severity: "info",
        });
    };

    return (
        <Snackbar className="editorSnackbar" open={open} autoHideDuration={5000} onClose={handleClose}>
            <Alert
                className="editorSnackbarAlert"
                severity={severity}
                action={
                    <IconButton
                        className="editorSnackBarAlertCloseButton"
                        aria-label="close"
                        color="inherit"
                        size="small"
                        onClick={handleClose}
                    >
                        <CloseIcon fontSize="inherit" />
                    </IconButton>
                }
            >
                {message}
            </Alert>
        </Snackbar>
    );
};

export default EditorSnackbar;
