import { Static, t } from "elysia";
import { BaseSessionParams } from "../Session/Session.types";

export const GetMessageQuery = t.Object({
    page: t.Number({
        error: "Page is required"
    }),
    limit: t.Number({
        error: "Maximum limit required and maximum is 100",
        maximum: 100
    }),
    from_me: t.Optional(t.Boolean({
        error: "From me is boolean type"
    })),
    is_media: t.Optional(t.Boolean({
        error: "Is media is boolean type"
    })),
    is_read: t.Optional(t.Boolean({
        error: "Is read is boolean type"
    })),
    ack: t.Optional(t.Number({
        error: "Ack is number type"
    })),
    ack_string: t.Optional(t.Enum({
        pending: "pending",
        sent: "sent",
        delivered: "delivered",
        read: "read",
        played: "played",
        error: "error"
    }))
})

export interface IGetMessage extends BaseSessionParams {
    query: Static<typeof GetMessageQuery>
}