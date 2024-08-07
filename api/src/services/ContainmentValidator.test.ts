import Config from "../models/Config";
import ContainmentValidator from "./ContainmentValidator";

describe("ContainmentValidator", () => {
    describe("checkForParentModelErrors", () => {
        let validator: ContainmentValidator;

        beforeEach(() => {
            Config.setInstance(new Config({ trash_pid: "trash:123" }));
            validator = ContainmentValidator.getInstance();
        });

        it("won't allow data in folder", () => {
            expect(
                validator.checkForParentModelErrors("foo:123", ["vudl-system:FolderModel"], ["vudl-system:DataModel"]),
            ).toEqual("Illegal parent foo:123; not a collection!");
        });
    });
});
