import { larkVerification } from '@/js-sdk/message-center/lark/lark-verification';
import { Params } from '@/js-sdk/typings';
import { success } from '@/js-sdk/lib/response';
import AirCodeStorage from '@/js-sdk/storage/air-code-storage';
import Controller from '@/js-sdk/controller';
import Openai from '@/js-sdk/ai/openai/openai';
import LarkMessageCenter from '@/js-sdk/message-center/lark/lark-message-center';
import { CardParams } from '@/js-sdk/typings/typing-message';

export default async function (params: Params | CardParams, context) {
    console.log(`ID:1，params：`, params);
    console.log(`ID:2，context：`, context);

    //飞书消息通知
    if (params?.header?.event_type === 'im.message.receive_v1') {
        const messageCenter = new LarkMessageCenter(params);
        const ai = new Openai();
        const storage = new AirCodeStorage();
        const controller = new Controller(storage, ai, messageCenter);
        await controller.onMessage();
        return success();
    }

    //飞书卡片交互消息通知
    if (params.action) {
        const messageCenter = new LarkMessageCenter(params.action.value.data);
        const ai = new Openai();
        const storage = new AirCodeStorage();
        const controller = new Controller(storage, ai, messageCenter);
        await controller.handleCardMessage(params as CardParams);
        return success();
    }

    //定时任务
    if (context.trigger === 'SCHEDULE') {
        await new AirCodeStorage().clearEventData();
        return;
    }

    //飞书平台校验
    if (params.type === 'url_verification') {
        return larkVerification(params);
    }

    //其他消息不做处理，直接返回请求成功响应，避免飞书重复发送通知消息
    return success();
}
