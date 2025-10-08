import { Static, t } from "elysia"
import { BaseSessionParams } from "../Session.types"

export const SendTextBody = t.Object({
    to: t.String({
        error: "To is required"
    }),
    message: t.String({
        error: "Message is required"
    }),
    quotedMessageId: t.Optional(t.String())
})

export interface ISendText extends BaseSessionParams {
    body: Static<typeof SendTextBody>
}

export const SendImageDto = t.Object({
    to: t.String({
        error: "To is required"
    }),
    caption: t.String({
        error: "Caption is required"
    }),
    imageUrl: t.Optional(t.String({
        format: "uri",
        error: "Url format is not valid"
    })),
    imageFile: t.Optional(t.File({
        error: "Image file not valid",
        maxSize: 10 * 1024 * 1024,
    }))
})

export interface ISendImage extends BaseSessionParams {
    body: Static<typeof SendImageDto>
}





export const SendDocDto = t.Object({
    to: t.String({
        error: "To is required"
    }),
    caption: t.String({
        error: "Caption is required"
    }),
    docFile: t.Optional(t.File({
        maxSize: 10 * 1024 * 1024,
        error: "Max file size is 10MB"
    })),
    docUrl: t.Optional(t.String({
        format: "uri",
        error: "Url format is not valid"
    }))

})

export interface ISendDoc extends BaseSessionParams {
    body: Static<typeof SendDocDto>
}

export const ReadBodyDto = t.Object({
    to: t.String({
        error: "To is required"
    }),
    messageIds: t.Optional(t.Array(t.String({
        error: "Message id is required"
    })))
})

export interface IRead extends BaseSessionParams {
    body: Static<typeof ReadBodyDto>
}

export const TypingBodyDto = t.Object({
    to: t.String({
        error: "To is required"
    })
})

export interface ITyping extends BaseSessionParams {
    body: Static<typeof TypingBodyDto>
}