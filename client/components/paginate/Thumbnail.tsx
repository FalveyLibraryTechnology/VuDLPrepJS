import React, { useEffect, forwardRef } from "react";
import { usePaginatorContext } from "../../context/PaginatorContext";

interface ThumbnailProps {
    scrollTo: (i: number) => void;
    number: number;
    selected: boolean;
}

const Thumbnail = forwardRef(({ scrollTo, number, selected }: ThumbnailProps, ref): React.ReactElement => {
    const {
        state: { order },
        action: { getLabel, getMagicLabel, setPage, getJobImageUrl },
    } = usePaginatorContext();
    useEffect(() => {
        if (selected) {
            scrollTo(number);
        }
    }, [selected]);

    const url = getJobImageUrl(order[number], "thumb");
    const img = url ? <img alt={`thumbnail ${number}`} src={url} /> : "";
    return (
        <div onClick={() => setPage(number)} className={"thumbnail" + (selected ? " selected" : "")} ref={ref}>
            {img}
            <div className="number">{number + 1}</div>
            <div className={"label" + (getLabel(number) === null ? " magic" : "")}>{getMagicLabel(number)}</div>
        </div>
    );
});
Thumbnail.displayName = "Thumbnail";

export default Thumbnail;
