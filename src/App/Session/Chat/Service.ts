import { proto } from "@whiskeysockets/baileys";
import { sessionManager } from "../../..";
import { ResponseApiSuccess } from "../../../Helper/ResponseApi";
import { ErrorResponse } from "../../../Helper/ResponseError";
import { CleanUUID } from "../../../Helper/uuid";
import { MessageData } from "../../../Types";
import { SessionService } from "../Service";
import { IRead, ISendDoc, ISendImage, ISendText, ITyping } from "./Chat.types";

export class ChatService extends SessionService {

    constructor() {
        super();
    }

    SendText = async (props: ISendText) => {
        const { params, set, body } = props;
        const { sessionName } = params;
        const { to, message, quotedMessageId } = body;
        await this.checkSession(sessionName);
        const result: proto.IWebMessageInfo = await sessionManager.sendMessage(sessionName, to, message, 'text', quotedMessageId);
        return ResponseApiSuccess({
            set,
            data: {
                messageId: result.key?.id,
            }
        })
    }

    SendImage = async (props: ISendImage) => {
        const { params, set, body } = props;
        const { sessionName } = params;
        const { to, imageUrl, imageFile, caption } = body;
        await this.checkSession(sessionName);
        let buffer: Buffer | undefined = undefined
        if (imageFile) {
            const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"]
            if (!allowedMimeTypes.includes(imageFile.type)) {
                throw new ErrorResponse(400, "INVALID_IMAGE_TYPE", "Invalid image type");
            }
            buffer = Buffer.from(await imageFile.arrayBuffer());
        }
        const messageData: MessageData = {
            url: imageUrl,
            buffer: buffer,
            caption: caption,
            fileName: `${CleanUUID()}.png`,
            mimetype: imageFile ? imageFile.type : "image/png"
        }
        const result: proto.IWebMessageInfo = await sessionManager.sendMessage(sessionName, to, messageData, 'image');
        return ResponseApiSuccess({
            set,
            data: {
                messageId: result.key?.id,
            }
        })
    }

    SendDocument = async (props: ISendDoc) => {
        const { params, set, body } = props;
        const { sessionName } = params;
        const { to, docFile, docUrl, caption } = body;
        await this.checkSession(sessionName);
        let buffer: Buffer | undefined = undefined
        if (docFile) {
            const allowedDoctTypes = [
                "application/pdf", "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            ]
            if (!allowedDoctTypes.includes(docFile.type)) {
                throw new ErrorResponse(400, "INVALID_DOC_TYPE", "Invalid document type");
            }
            buffer = Buffer.from(await docFile.arrayBuffer());
        }

        const messageData: MessageData = {
            url: docUrl,
            buffer: buffer,
            caption: caption,
            fileName: `${CleanUUID()}.${docFile ? docFile.type : "pdf"}`,
            mimetype: docFile ? docFile.type : "image/png"
        }

        const result: proto.IWebMessageInfo = await sessionManager.sendMessage(sessionName, to, messageData, 'document');
        return ResponseApiSuccess({
            set,
            data: {
                messageId: result.key?.id,
            }
        })
    }

    Read = async (props: IRead) => {
        const { params, set, body } = props;
        const { sessionName } = params;
        const { to, messageIds } = body;
        const session = await this.checkSession(sessionName);
        await sessionManager.sendRead(session, to, messageIds);
        return ResponseApiSuccess({
            set,
        })
    }

    Typing = async (props: ITyping) => {
        const { params, set, body } = props;
        const { sessionName } = params;
        const { to } = body;
        await this.checkSession(sessionName);
        await sessionManager.sendTyping(sessionName, to);
        return ResponseApiSuccess({
            set,
        })
    }

    StopTyping = async (props: ITyping) => {
        const { params, set, body } = props;
        const { sessionName } = params;
        const { to } = body;
        await this.checkSession(sessionName);
        await sessionManager.stopTyping(sessionName, to);
        return ResponseApiSuccess({
            set,
        })
    }
}