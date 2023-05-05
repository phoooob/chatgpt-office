import { Header, Message, Params } from '@/js-sdk/typings';
import { logger } from '@/js-sdk/lib/logger';
import { FEISHU_BOT_NAME } from '@/js-sdk/config';
import { CardMessageOption, CardParams, MessageCenter } from '@/js-sdk/typings/typing-message';
import useClient from '@/js-sdk/message-center/lark/lark-client';
import LarkCardMessage from '@/js-sdk/message-center/lark/lark-card-message';

const client = useClient();

export default class LarkMessageCenter implements MessageCenter {
    readonly params: Params;
    private readonly message: Message;
    private readonly header: Header;
    private readonly larkCardMessage: LarkCardMessage;

    constructor(params: Params) {
        this.params = params;
        this.header = params.header;
        this.message = params.event.message;
        this.larkCardMessage = new LarkCardMessage(this.messageId);
    }

    get eventId(): string {
        return this.header.event_id;
    }

    get messageId() {
        return this.message.message_id;
    }

    get sessionId() {
        const chatId = this.params.event.message.chat_id;
        const senderId = this.params.event.sender.sender_id.user_id;
        return `${chatId}_${senderId}`;
    }

    get content() {
        const data = JSON.parse(this.message.content);
        const mentionKeys = this.mentions.map(item => item.key);
        return mentionKeys.reduce((text, key) => {
            return text.replace(key, '').trim();
        }, data.text);
    }

    get notMentionedGroupMessage() {
        const isGroupMsg = this.message.chat_type === 'group';
        const notMentioned = this.mentions.every(item => item.name !== FEISHU_BOT_NAME);
        return isGroupMsg && notMentioned;
    }

    get isTextMessage() {
        return this.message.message_type === 'text';
    }

    private get mentions() {
        return this.message?.mentions || [];
    }

    async onCardMessageCommand(params: CardParams) {
        const type = params.action.value.type;
        const content = type === 'end' ? JSON.stringify({ text: '/end' }) : this.message.content;
        const data = this.createPostParams(content);
        return { type, data };
    }

    private createPostParams(content?: string) {
        return {
            schema: '2.0',
            header: {
                token: this.header.token,
                tenant_key: this.header.tenant_key,
                event_type: 'im.message.receive_v1'
            },
            event: {
                message: {
                    chat_id: this.message.chat_id,
                    chat_type: this.message.chat_type,
                    message_id: this.message.message_id,
                    content: content ?? this.message.content,
                    message_type: 'text'
                },
                sender: this.params.event.sender
            }
        };
    }

    /**
     * 回复文本消息
     */
    async replyTextMessage(text: string) {
        try {
            return await client.im.message.reply({
                path: {
                    message_id: this.message.message_id
                },
                data: {
                    content: JSON.stringify({ text }),
                    msg_type: 'text'
                }
            });
        } catch (e) {
            logger('发送飞书消息发生错误：', { e, params: this.params, text });
        }
    }

    /**
     * 发送文本消息
     */
    async sendTextMessage(text: string) {
        try {
            return await client.im.message.create({
                data: {
                    receive_id: this.message.chat_id,
                    msg_type: 'text',
                    content: JSON.stringify({ text })
                },
                params: {
                    receive_id_type: 'chat_id'
                }
            });
        } catch (e) {
            logger('发送飞书消息发生错误：', { e, params: this.params, text });
        }
    }

    async sendUniqueCardMessage(option: CardMessageOption): Promise<string> {
        return await this.larkCardMessage.sendCardMessage(option);
    }

    async updateCardMessageById(messageId: string, option: CardMessageOption): Promise<any> {
        const cardMsg = new LarkCardMessage(undefined);
        return await cardMsg.updateCardMessage(option, messageId);
    }

    get cardMessageId() {
        return this.larkCardMessage.cardMessageId;
    }
}
