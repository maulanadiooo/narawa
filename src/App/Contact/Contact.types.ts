import { Static, t } from "elysia";
import { BaseSessionParams } from "../Session/Session.types";

export const GetContactQuery = t.Object({
    page: t.Number({
        error: "Page is required"
    }),
    limit: t.Number({
        error: "Maximum limit required and maximum is 100",
        maximum: 100
    }),
    identifier: t.Optional(t.Array(t.Enum({
        personal: "personal",
        personal_id: "personal_id",
        group: "group",
        other: "other"
    })))
})

export interface IGetContact extends BaseSessionParams {
    query: Static<typeof GetContactQuery>
}