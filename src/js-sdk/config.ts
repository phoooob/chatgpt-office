import { Models } from '@/js-sdk/enums';

export const FEISHU_APP_ID = process.env.FEISHU_APP_ID || import.meta.env.FEISHU_APP_ID; // 飞书的应用 ID
export const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || import.meta.env.FEISHU_APP_SECRET; // 飞书的应用的 Secret
export const FEISHU_BOT_NAME = process.env.FEISHU_BOT_NAME || import.meta.env.FEISHU_BOT_NAME; // 飞书机器人的名字
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY; // OpenAI 的 Key
export const OPENAI_API_MODEL = process.env.OPENAI_API_MODEL || import.meta.env.OPENAI_API_MODEL || Models.GPT3; // 使用的模型
export const OPENAI_MODEL_MAX_TOKEN = Number(
    process.env.OPENAI_MODEL_MAX_TOKEN ?? import.meta.env.OPENAI_MODEL_MAX_TOKEN ?? 4096
);
export const POST_URL = process.env.POST_URL || import.meta.env.POST_URL; // 回调地址
