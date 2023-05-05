import { FEISHU_APP_ID, FEISHU_APP_SECRET } from '@/js-sdk/config';
import { Client } from '@larksuiteoapi/node-sdk';

const Lark = require('@larksuiteoapi/node-sdk');

let larkClient = null;
export default function useClient(): Client {
    if (!larkClient) {
        larkClient = new Lark.Client({
            appId: FEISHU_APP_ID,
            appSecret: FEISHU_APP_SECRET,
            disableTokenCache: false
        });
    }
    return larkClient;
}
