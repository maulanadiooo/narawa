import { Static, t } from "elysia";
import { IGlobalInterfaceService } from "../../Helper/GlobalInterfaceService";

export const SessionCreateDto = t.Object({
    sessionName: t.String({
        error: "Session name is required"
    }),
    webhookUrl: t.Optional(t.String({})),
    phoneNumber: t.Optional(t.String({}))
})

export interface ISessionCreate extends IGlobalInterfaceService {
    body: Static<typeof SessionCreateDto>
}

export const SessionParamsDto = t.Object({
    sessionName: t.String({
        error: "Session name is required"
    })
})

export interface BaseSessionParams extends IGlobalInterfaceService {
    params: Static<typeof SessionParamsDto>
}

export const GetQrDataQuery = t.Optional(t.Object({
    is_image: t.Optional(t.Enum({
        true: "true",
        false: "false"
    }))
}))

export interface IGetQrData extends BaseSessionParams {
    query: Static<typeof GetQrDataQuery>
}

export interface IGetStatus extends BaseSessionParams { }

export interface IDeleteSession extends BaseSessionParams { }
export interface IRestartSession extends BaseSessionParams { }
export interface IGetPairingCode extends BaseSessionParams { }


