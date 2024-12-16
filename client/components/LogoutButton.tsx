import React, { useEffect, useState } from "react";

import { logoutUrl } from "../util/routes";
import { useFetchContext } from "../context/FetchContext";

const LogoutButton = (): React.ReactElement => {
    const {
        state: { token },
        action: { clearToken },
    } = useFetchContext();
    const [showButton, setShowButton] = useState<boolean>(false);
    useEffect(() => {
        setShowButton(token !== null);
    }, [token]);
    return showButton ? (
        <div className="logout">
            <a href={logoutUrl} className="button btn-primary" onClick={clearToken}>
                Log Out
            </a>
        </div>
    ) : (
        <></>
    );
};

export default LogoutButton;
