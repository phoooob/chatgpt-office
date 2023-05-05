import { CardMessageOption } from '@/js-sdk/typings/typing-message';
import { logger } from '@/js-sdk/lib/logger';
import { Client } from '@larksuiteoapi/node-sdk';
import useClient from '@/js-sdk/message-center/lark/lark-client';
import { convertMarkdownToMsgJson } from '@/js-sdk/message-center/lark/lark-markdown-convert';
import { throttlePromise } from '@/js-sdk/lib/throttle';
import { sleep } from '@/js-sdk/lib/kit';

export default class LarkCardMessage {
    private readonly replyMessageId: string;
    private readonly client: Client = useClient();
    private readonly sendOrUpdateThrottle = null;
    public cardMessageId: string;
    private title: string;
    private readonly time;

    constructor(replyMessageId: string) {
        this.replyMessageId = replyMessageId;
        this.time = Date.now();
        console.log(`ID:16，this.replyMessageId：`, this.replyMessageId);
        this.sendOrUpdateThrottle = throttlePromise(this.sendOrUpdate, 1000);
    }

    async sendCardMessage(option: CardMessageOption): Promise<any> {
        if (option.throttle) {
            return await this.sendOrUpdateThrottle(option);
        } else {
            return await this.sendOrUpdate(option);
        }
    }

    async sendOrUpdate(option: CardMessageOption): Promise<any> {
        console.log(`ID:81，累计耗时：`, (Date.now() - this.time) / 1000);
        if (!this.cardMessageId) {
            return await this.replyCardMessage(option);
        } else {
            return await this.updateCardMessage(option);
        }
    }

    /**
     * 卡片消息
     */
    async replyCardMessage(option: CardMessageOption): Promise<any> {
        if (!option.content) return;
        try {
            const res = await this.client.im.message.reply({
                path: {
                    message_id: this.replyMessageId
                },
                data: {
                    content: this.createCardContent(option),
                    msg_type: 'interactive'
                }
            });
            logger(`ID:162，this.cardMessageId：`, this.cardMessageId);
            this.cardMessageId = res.data.message_id;
            return res;
        } catch (e) {
            logger('发送飞书卡片消息发生错误：', { e, option });
        }
    }

    async updateCardMessage(option: CardMessageOption, messageId?: string, retryTimes = 0): Promise<any> {
        if (!option.content) return;
        const res = await this.client.im.message.patch({
            path: {
                message_id: messageId ?? this.cardMessageId
            },
            data: {
                content: this.createCardContent(option)
            }
        });
        //触发频次限制，重新再发一次
        if (res.code === 230020 && retryTimes < 10) {
            await sleep(200);
            return await this.updateCardMessage(option, messageId, retryTimes + 1);
        }
        if (res.code !== 0) {
            console.error(`ID:73，res：`, res);
        }
        return res;
    }

    private createCardContent(option: CardMessageOption) {
        if (option.title) this.title = option.title;
        const data = {
            config: {
                update_multi: true,
                wide_screen_mode: true
            }
        };
        this.setTitle(data, option);
        this.setElements(data, option);
        return JSON.stringify(data);
    }

    private setTitle(data, option: CardMessageOption) {
        if (option.title) this.title = option.title;
        if (this.title) {
            data.header = {
                template: 'blue',
                title: {
                    tag: 'plain_text',
                    content: this.title
                }
            };
        }
    }

    private setElements(data, option: CardMessageOption) {
        data.elements = convertMarkdownToMsgJson(option.content);
        const actions = option.actions ?? [];
        data.elements.push({
            tag: 'action',
            actions: actions.map(item => {
                return {
                    tag: 'button',
                    text: {
                        content: item.btnText,
                        tag: 'plain_text'
                    },
                    type: item.btnType || 'default',
                    value: {
                        type: item.type,
                        data: item.data
                    }
                };
            })
        });
    }
}
