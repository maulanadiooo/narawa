import { sessionManager } from "../..";
import { ResponseApiSuccess } from "../../Helper/ResponseApi";
import { ErrorResponse } from "../../Helper/ResponseError";
import { UuidV7 } from "../../Helper/uuid";
import { Labels } from "../../Models/Labels";
import { LabelAssociation } from "../../Models/LabelsAssociation";
import { LabelTypes } from "./Label.types";

const labelModel = new Labels();
const labelAssociationModel = new LabelAssociation();
export class LabelService {
    GetLabel = async (props: LabelTypes.IGetLabel) => {
        const { session, set } = props;
        const labels = await labelModel.getAllLabels(session);
        return ResponseApiSuccess({
            set,
            data: labels
        });
    }

    GetLabelAssigned = async (props: LabelTypes.IGetLabelAssigned) => {
        const { session, set } = props;
        const labels = await labelAssociationModel.getAllLabels(session);
        return ResponseApiSuccess({
            set,
            data: labels
        });
    }

    AddLabel = async (props: LabelTypes.IAddLabel) => {
        const { session, set, body } = props;

        const idLabel = await sessionManager.addLabel(session, body.name);
        return ResponseApiSuccess({
            set,
            message: "Label added successfully",
            data: {
                label_id: idLabel,
            }
        });
    }

    DeleteLabel = async (props: LabelTypes.IDeleteLabel) => {
        const { session, set, params } = props;
        await sessionManager.removeLabel(session, params.labelId);
        return ResponseApiSuccess({
            set,
            message: "Label deleted successfully"
        });
    }

    EditLabel = async (props: LabelTypes.IEditLabel) => {
        const { session, set, params, body } = props;
        await sessionManager.editLabel(session, params.labelId, body.name);
        return ResponseApiSuccess({
            set,
            message: "Label edited successfully"
        });
    }

    AssignLabelChat = async (props: LabelTypes.IAssignLabelChat) => {
        const { session, set, body } = props;
        await sessionManager.assignLabelChat(session, body.phoneNumber, body.labelId);
        return ResponseApiSuccess({
            set,
            message: "Label assigned to chat successfully"
        });
    }

    RemoveLabelChat = async (props: LabelTypes.IRemoveLabelChat) => {
        const { session, set, body } = props;
        await sessionManager.removeLabelChat(session, body.phoneNumber, body.labelId);
        return ResponseApiSuccess({
            set,
            message: "Label removed from chat successfully"
        });
    }
}

function getColorHexFromId(color: number): string | undefined {
    throw new Error("Function not implemented.");
}
