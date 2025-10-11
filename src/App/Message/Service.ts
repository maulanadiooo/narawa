import { IGetMessage } from "./Message.types";
import { Message } from "../../Models/Message";
import { ResponseApiSuccess } from "../../Helper/ResponseApi";

const messageModel = new Message();

export class MessageService {
    GetMessage = async (props: IGetMessage) => {
        const { set, query } = props;
        const { limit } = query;
        const { messages, totalData } = await messageModel.getByPagination(props);
        const totalPage = Math.ceil(totalData[0].totalData ?? 0 / limit);
        return ResponseApiSuccess({
            set,
            data: {
                messages,
                totalPage
            }
        });
    }
}