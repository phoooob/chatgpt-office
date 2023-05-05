import { Params } from '@/js-sdk/typings/index';

export interface MessageCenter {
    /**
     * 参数
     */
    params: Params;

    /**
     * 卡片消息ID
     */
    get cardMessageId(): string;

    /**
     * 回复文本消息
     */
    replyTextMessage(text: string): Promise<any>;

    /**
     * 发送消息到当前会话
     * @param text
     */
    sendTextMessage(text: string): Promise<any>;

    /**
     * 发送卡片消息，每次会话只发送一次，下次再发送为更新
     */
    sendUniqueCardMessage(option?: CardMessageOption): Promise<any>;

    /**
     * 根据卡片消息ID更新卡片消息
     */
    updateCardMessageById(messageId: string, option: CardMessageOption): Promise<any>;

    /**
     * 处理卡片按钮事件
     * @return 返回指令名称
     */
    onCardMessageCommand(params: CardParams): Promise<{ type: 'end' | 'onMessage'; data: any }>;

    /**
     * 是否为没有@机器人的群消息
     */
    get notMentionedGroupMessage(): boolean;

    /**
     * 是否为文本消息
     */
    get isTextMessage(): boolean;

    /**
     * 本次文本消息内容
     */
    get content(): string;

    /**
     * 本次会话用户唯一标识
     */
    get sessionId(): string;

    /**
     * 本次消息唯一标识
     */
    get messageId(): string;

    /**
     * 当前事件通知的ID
     */
    get eventId(): string | undefined;
}

export interface CardMessageOption {
    content: string;
    title?: string;
    throttle?: boolean;
    actions?: Array<{
        btnText: string;
        btnType?: string;
        type: string;
        data: any;
    }>;
}

export interface CardAction {
    tag: string;
    value: {
        type: 'end' | 'onMessage';
        data: Params;
    };
}

export interface CardParams extends Params {
    open_id: string;
    user_id: string;
    open_message_id: string;
    open_chat_id: string;
    tenant_key: string;
    token: string;
    action: CardAction;
}
