import React, { useEffect, useRef } from "react";

import Zoomy from "../../util/Zoomy";

interface PaginatorZoomyProps {
    img: string;
}

const PaginatorZoomy = ({ img }: PaginatorZoomyProps): React.ReactElement => {
    const status = useRef();
    const initializeZoomy = () => {
        Zoomy.init(document.getElementById("zoomy"));
    };
    const loadZoomy = () => {
        Zoomy.load(
            img,
            function () {
                Zoomy.resize();
                Zoomy.center();
                status.current.className = "hidden";
            }.bind(this),
        );
    };

    useEffect(() => {
        initializeZoomy();
        loadZoomy();
    }, [img]);

    return (
        <div>
            <div ref={status} id="zoomyStatus">
                Loading...
            </div>
            <canvas id="zoomy"></canvas>
        </div>
    );
};

export default PaginatorZoomy;
