import React from "react";
import { useEditorContext } from "../../context/EditorContext";

export interface ObjectModelsProps {
    pid: string;
}

const ObjectModels = ({ pid }: ObjectModelsProps): React.ReactElement => {
    const {
        state: { objectDetailsStorage },
    } = useEditorContext();
    const models = objectDetailsStorage?.[pid]?.models ?? [];
    return models.length > 0 ? (
        <div>
            <b>Models:</b>
            <ul>
                {models.sort().map((model: string) => {
                    const modelName = model.replace("vudl-system:", "");
                    return (
                        <li style={{ border: 0 }} key={modelName}>
                            {modelName}
                        </li>
                    );
                })}
            </ul>
        </div>
    ) : (
        <div></div>
    );
};

export default ObjectModels;
