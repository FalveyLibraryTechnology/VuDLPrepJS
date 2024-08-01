import Config from "../models/Config";

class ContainmentValidator {
    private static instance: ContainmentValidator;
    protected config: Config;

    constructor(config: Config) {
        this.config = config;
    }

    public static getInstance(): ContainmentValidator {
        if (!ContainmentValidator.instance) {
            ContainmentValidator.instance = new ContainmentValidator(Config.getInstance());
        }
        return ContainmentValidator.instance;
    }

    public static setInstance(instance: ContainmentValidator): void {
        ContainmentValidator.instance = instance;
    }

    /**
     * Validate parent and child models to be sure the objects can be legally related.
     * @param parentPid    Parent PID being checked (used for messages and special case handling)
     * @param parentModels All models of parent PID
     * @param childModels  All models of child PID
     * @returns Error message if a problem is found, null if the relationship is valid
     */
    public checkForParentModelErrors(
        parentPid: string,
        parentModels: Array<string>,
        childModels: Array<string>,
    ): string | null {
        // Special case: anything is allowed to go in the trash:
        if (this.config.trashPid && this.config.trashPid === parentPid) {
            return null;
        }
        if (!parentModels.includes("vudl-system:CollectionModel")) {
            return `Illegal parent ${parentPid}; not a collection!`;
        }
        if (childModels.includes("vudl-system:DataModel") && !parentModels.includes("vudl-system:ListCollection")) {
            return "DataModel objects must be contained by a ListCollection";
        }
        if (
            childModels.includes("vudl-system:ListCollection") &&
            !parentModels.includes("vudl-system:ResourceCollection")
        ) {
            return "ListCollection objects must be contained by a ResourceCollection";
        }
        if (
            childModels.includes("vudl-system:ResourceCollection") &&
            !parentModels.includes("vudl-system:FolderCollection")
        ) {
            return "ResourceCollection objects must be contained by a FolderCollection";
        }
        if (
            childModels.includes("vudl-system:FolderCollection") &&
            !parentModels.includes("vudl-system:FolderCollection")
        ) {
            return "FolderCollection objects must be contained by a FolderCollection";
        }
        return null;
    }
}

export default ContainmentValidator;
