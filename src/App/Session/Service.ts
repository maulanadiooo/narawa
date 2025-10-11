import { printConsole, sessionManager } from "../..";
import { ResponseApiSuccess } from "../../Helper/ResponseApi";
import { ErrorResponse } from "../../Helper/ResponseError";
import { CleanUUID } from "../../Helper/uuid";
import { ISession, MessageData } from "../../Types";
import { IDeleteSession, IGetPairingCode, IGetQrData, IGetStatus, IRestartSession, ISessionCreate } from "./Session.types";
import qrcode from 'qrcode';
export class SessionService {

    CreateSession = async (props: ISessionCreate) => {
        const { set, body } = props;
        const { sessionName, webhookUrl, phoneNumber } = body;
        const session = await sessionManager.createSession(sessionName, webhookUrl, phoneNumber);

        return ResponseApiSuccess({
            set, data: {
                id: session.id,
                sessionName: session.sessionName,
                status: session.status
            }
        })
    }

    GetQrData = async (props: IGetQrData) => {
        const { set, params, query, session } = props;
        const { sessionName } = params;

        if (session.status !== 'qr_required' || !session.qrCode) {
            throw new ErrorResponse(400, "SESSION_NOT_READY", `QR code not available, your session status is ${session.status}`);
        }

        if (query.is_image === "true") {
            const qrCodeBase64 = await qrcode.toDataURL(session.qrCode ?? "");
            const base64 = qrCodeBase64.split(",")[1];
            const imageBuffer = Buffer.from(base64, "base64");
            set.headers["Content-Type"] = "image/png";
            set.headers["Content-Length"] = imageBuffer.length.toString();
            set.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            set.headers["Pragma"] = "no-cache";
            set.headers["Expires"] = "0";
            return imageBuffer;
        }

        return ResponseApiSuccess({
            set, data: {
                qr: session.qrCode,
                sessionName: session.sessionName,
                status: session.status
            }
        })

    }

    GetStatus = async (props: IGetStatus) => {
        const { set, params } = props;
        const { sessionName } = params;

        const sessionData = await sessionManager.getSessionStatus(sessionName);
        if (!sessionData) {
            throw new ErrorResponse(404, "SESSION_NOT_FOUND", "Session not found");
        }

        return ResponseApiSuccess({
            set,
            data: sessionData
        })
    }

    DeleteSession = async (props: IDeleteSession) => {
        const { params, set } = props;
        const { sessionName } = params;
        await sessionManager.deleteSession(sessionName);
        return ResponseApiSuccess({
            set,
        })
    }

    RestartSession = async (props: IRestartSession) => {
        const { params, set } = props;
        const { sessionName } = params;
        await sessionManager.restartSession(sessionName);
        return ResponseApiSuccess({
            set,
        })
    }

    GetPairingCode = async (props: IGetPairingCode) => {
        const { params, set, query, session } = props;
        const { sessionName } = params;
        const { isNew } = query;
        if (!session.isPairingCode) {
            throw new ErrorResponse(400, "SESSION_NOT_PAIRING_CODE", "Session not using pairing code");
        }
        if (session.pairingStatus === 'paired') {
            throw new ErrorResponse(400, "SESSION_PAIRED", "Session already paired");
        }
        if (!session.pairingCode) {
            throw new ErrorResponse(400, "SESSION_NO_PAIRING_CODE", "Pairing code is not available yet");
        }
        let code = session.pairingCode;
        if (isNew) {
            const sessionData = await sessionManager.getSession(sessionName);
            if (!sessionData) {
                throw new ErrorResponse(404, "SESSION_NOT_FOUND", "Session not found");
            }
            if (!session.phoneNumber) {
                throw new ErrorResponse(400, "SESSION_NO_PHONE_NUMBER", "Need phone number to request pairing code");
            }
            code = await sessionData.socket.requestPairingCode(session.phoneNumber);
        }
        return ResponseApiSuccess({
            set, data: { code }
        })
    }
}