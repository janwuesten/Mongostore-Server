import { Document, Timestamp } from 'mongodb';

const decoder = {
    "$$__$$SERVER_TIMESTAMP$$__$$": (value) => {
        return Timestamp.fromInt(Math.round(new Date(Date.now()).getTime() / 1000));
    },
    "$$__$$SERVER_MILLIS_TIMESTAMP$$__$$": (value) => {
        return Timestamp.fromNumber(new Date(Date.now()).getTime());
    }
};
function decode(data): Document {
    for(var key in data) {
        if(typeof data[key] == "object") {
            if(data[key] == null) {

            }else if(data[key].hasOwnProperty("mongostore_field_value")) {
                if(decoder.hasOwnProperty(data[key].mongostore_field_value)) {
                    data[key] = decoder[data[key].mongostore_field_value](data[key].mongostore_field_param);
                }
            }else{
                data[key] = decode(data[key]);
            }
        }else{
            if(decoder.hasOwnProperty(data[key])) {
                data[key] = decoder[data[key]](data[key]);
            }
        }
    }
    return data;
}
export default decode;