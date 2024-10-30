import React from "react";
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import { useGlobalContext } from "../context/GlobalContext";

export default function ThemeMenu() {
    const {
        state: { userTheme },
        action: { setUserTheme },
    } = useGlobalContext();

    function changeTheme(e) {
        setUserTheme(e.target.value);
    }

    return (
        <FormControl className="user-theme__menu">
            <InputLabel id="user-theme__label">Theme</InputLabel>
            <Select
                id="user-theme"
                value={userTheme}
                label="Theme"
                labelId="user-theme__label"
                onChange={changeTheme}
            >
                <MenuItem value={"system"}>System</MenuItem>
                <MenuItem value={"light"}>Light</MenuItem>
                <MenuItem value={"dark"}>Dark</MenuItem>
            </Select>
        </FormControl>
    );
}
