import type { Context } from "elysia";
import { ErrorResponse } from "./ResponseError";
import { printConsole } from "..";


export type TResponseApiJson<D, E> = {
    set: Context['set'],
    headers?: Context['headers'],
    statusCode: number,
    code: string,
    msg: string,
    status: boolean,
    data?: D,
    error?: E,
    responseType?: "JSON" | "HTML" | "TEXT",

}
export type TResponseApiSuccess<D> = {
    set: Context['set'],
    message?: string,
    data?: D,
    statusCode?: number,
    status?: boolean,
}
export type TReturnResponseJson = {
    success: boolean,
    code: string,
    message: string,
    errors?: any | null,
    data: any | null,
}

interface IRequestDataTable {
    draw: number,
    total: number,
    data: object,
    set: Context['set'],
    otherResponse?: object,

}


export const ResponseApi = ({
    set,
    statusCode,
    msg,
    status,
    code,
    data = null,
    error = [],
    responseType = "JSON",
}: TResponseApiJson<object | null, any>): TReturnResponseJson => {
    set.status = statusCode;
    if (responseType === "JSON") {
        set.headers["Content-Type"] = "Application/json";
    }
    let response: TReturnResponseJson = {
        success: status,
        code,
        message: msg,
        data,
    }
    if (error.length > 0) {
        response.errors = error;
    }
    return response;
}

export const ResponseApiSuccess = ({ set, message = "Success", data = null, statusCode = 200, status = true }: TResponseApiSuccess<object | null>): TReturnResponseJson => {
    return ResponseApi({
        set: set,
        status,
        statusCode: statusCode,
        data: data,
        msg: message,
        code: "OK"
    })
}

export const ReturnCatchError = (e: any, set: Context['set'], headers: Context['headers'], errorCode: string = "UNKNOWN_ERROR"): TReturnResponseJson => {
    if (e instanceof ErrorResponse) {
        return ResponseApi({
            set: set,
            headers: headers,
            msg: `${e.message}`,
            statusCode: 400,
            status: false,
            code: e.code,
            error: e,
        })
    } else {
        printConsole.error(`Panic! Unknown error! ${e}`)
        return ResponseApi({
            set: set,
            headers: headers,
            msg: `Panic! Unknown error!`,
            statusCode: 400,
            status: false,
            code: errorCode,
            error: e,
        })
    }

}

export const ResponseNotAuthorized = (set: Context['set'], headers: Context["headers"], message: string = StringResponse.noAUth) => {
    return ResponseApi({
        set: set,
        headers: headers,
        statusCode: 401,
        msg: message,
        status: false,
        code: StringResponse.noAuthCode,
    })
}

export const ResponseApiJsonDataTable = (dataTable: IRequestDataTable) => {
    dataTable.set.status = 200;
    dataTable.set.headers["Content-Type"] = "Application/json";

    return {
        draw: Number(dataTable.draw),
        recordsTotal: dataTable.total,
        recordsFiltered: dataTable.total,
        data: dataTable.data,
        otherResponse: dataTable.otherResponse,
    }
}


export const StringResponse = {
    noAUth: 'Unauthorized',
    noAuthRole: 'You dont have access',
    noAutRoleCode: 'NO_ROLE',
    noAuthCode: 'UNAUTHORIZED',
    badApiKey: 'Bad APIKEY',
    apiKeyInActive: 'Your apikey is not active yet',
    noBalanceCode: 'insufficient_balance',
    noBalance: 'Insufficient balance'
}