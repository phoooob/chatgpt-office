import { Roles } from '@/js-sdk/enums';
import { CardAction, CardMessageOption } from '@/js-sdk/typings/typing-message';

export interface Params {
    schema: string; //'2.0'
    type: string;
    challenge?: string;
    token?: string;
    header: Header;
    event: {
        sender: {
            sender_id: {
                user_id: string;
            };
            sender_type: string; // 'user'
            tenant_key: string;
        };
        message: Message;
    };
    action?: CardAction;
    actionData?: CardMessageOption;
}

export interface Message {
    mentions: Array<{ name: string; key: string }>;
    message_id: string;
    chat_id: string;
    message_type: string;
    content: string;
    create_time: number;
    chat_type: 'p2p' | 'group';
}

export interface Header {
    event_type: string; //im.message.receive_v1
    event_id: string;
    token: string;
    tenant_key: string;
    app_id: string;
    create_time: number;
}

export type Prompts = Array<Prompt>;

export interface Prompt {
    role: Roles;
    content: string;
    name?: string;
    token?: number;
}

export interface CompletionData {
    id: string;
    object: string;
    created: number;
    model: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    choices: Array<{
        message: {
            role: Roles;
            content: string;
        };
        finish_reason: string;
        index: number;
    }>;
}

export interface StorageManager {
    /**
     * 根据eventId判断是否是同一个事件的重复通知
     * @param event_id
     */
    isSameEvent(event_id: string): Promise<boolean>;

    /**
     * 根据sessionId清空会话记录
     * @param sessionId
     */
    clearAllBySessionId(sessionId: string): Promise<void>;

    /**
     * 根据sessionId查找会话历史记录
     * @param sessionId
     */
    findMessagesBySessionId(sessionId: string): Promise<Array<MessageData>>;

    /**
     * 根据sessionId查找最后一次会话历史记录
     * @param sessionId
     */
    findLastMessagesBySessionId(sessionId: string): Promise<MessageData>;

    /**
     * 保存会话记录
     * @param data
     */
    saveMessage(data: MessageData): Promise<void>;

    /**
     * 定时清理事件数据
     */
    clearEventData(): Promise<void>;

    /**
     * 根据提示词标题获取内容
     */
    findPromptByTitle(title: string): Promise<PromptData>;
}

export interface PromptData {
    title: string;
    prompt: string;
    id?: string;
}

export interface MessageData {
    question: string;
    answer: string;
    sessionId: string;
    cardMessageId: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    sort?: number;
    _id?: string;
}

export interface CompletionResult {
    success: boolean;
    answer: string;
    promptTokens?: number;
    totalTokens?: number;
    completionTokens?: number;
}

export interface ProgressData {
    isError?: boolean;
    content?: string;
    finished: boolean;
    fullContent: string;
}

export type OnProgress = (data: ProgressData) => Promise<void> | void;

export interface AI {
    getAnswer(historyList: Array<MessageData>, content: string, onProgress: OnProgress): Promise<void>;
}
