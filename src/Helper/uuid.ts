import { v4 as uuidV4, v7 as uuidV7 } from 'uuid';

const regexPattern = /[^A-Za-z0-9]/g;

interface ICleanUUID {
    version?: 4 | 7;
}
export const CleanUUID = (props?: ICleanUUID) => {
    const version = props?.version ?? 7
    if (version !== 4) {
        const randomUUID = UuidV7();
        return randomUUID.replace(regexPattern, "");
    }
    const randomUUID = uuidV4();
    return randomUUID.replace(regexPattern, "");
}

export const CUuidV4 = () => {

    return uuidV4();
}

export const UuidV7 = () => {
    return uuidV7();
}

