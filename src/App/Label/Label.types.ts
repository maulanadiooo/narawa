import { Static, t } from "elysia";
import { BaseSessionParams, SessionParamsDto } from "../Session/Session.types";

export namespace LabelTypes {
    export interface IGetLabel extends BaseSessionParams {}

    export interface IGetLabelAssigned extends BaseSessionParams {}

    export const AddLabelBody = t.Object({
        name: t.String(),
    })
    export const EditLabelBody = t.Object({
        name: t.String()
    })

    export interface IAddLabel extends BaseSessionParams {
        body: Static<typeof AddLabelBody>
    }

    export const DeleteLabelParams = t.Intersect([
        SessionParamsDto,
        t.Object({
            labelId: t.String(),
        })
    ])

    export interface IDeleteLabel extends BaseSessionParams {
        params: Static<typeof DeleteLabelParams>
    }

    export const EditLabelParams = t.Intersect([
        SessionParamsDto,
        t.Object({
            labelId: t.String(),
        })
    ])

    export interface IEditLabel extends BaseSessionParams {
        params: Static<typeof EditLabelParams>
        body: Static<typeof EditLabelBody>
    }

    export const AssignLabelChatBody = t.Object({
        phoneNumber: t.String(),
        labelId: t.String(),
    })

    export interface IAssignLabelChat extends BaseSessionParams {
        body: Static<typeof AssignLabelChatBody>
    }
    

    export const RemoveLabelChatBody = t.Object({
        phoneNumber: t.String(),
        labelId: t.String(),
    })

    export interface IRemoveLabelChat extends BaseSessionParams {
        body: Static<typeof RemoveLabelChatBody>
    }
}