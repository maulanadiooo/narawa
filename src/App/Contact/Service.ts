import { ResponseApiSuccess } from "../../Helper/ResponseApi";
import { Contact } from "../../Models/Contact";
import { IGetContact } from "./Contact.types";

const contactModel = new Contact();
export class ContactService {

    GetContact = async (props: IGetContact) => {
        const { set, query } = props;
        const { page, limit, identifier } = query;
        const { contacts, totalData } = await contactModel.getByPagination(props);
        const totalPage = Math.ceil(totalData[0].totalData ?? 0 / limit);
        return ResponseApiSuccess({
            set,
            data: {
                contacts,
                totalPage
            }
        });
    }
}