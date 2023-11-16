"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const axios = require("axios");
function logger(msg, data) {
  console.log(msg, data);
}
var Code = /* @__PURE__ */ ((Code2) => {
  Code2[Code2["SUCCESS"] = 0] = "SUCCESS";
  Code2[Code2["FAIL"] = -1] = "FAIL";
  return Code2;
})(Code || {});
var Roles = /* @__PURE__ */ ((Roles2) => {
  Roles2["USER"] = "user";
  Roles2["ASSISTANT"] = "assistant";
  Roles2["SYSTEM"] = "system";
  return Roles2;
})(Roles || {});
var Models = /* @__PURE__ */ ((Models2) => {
  Models2["GPT3"] = "gpt-3.5-turbo";
  Models2["GPT4"] = "gpt-4";
  return Models2;
})(Models || {});
function larkVerification(params) {
  const { challenge, type } = params;
  logger(`ID:7，处理飞书校验 params：`, params);
  return { challenge, code: Code.SUCCESS };
}
function success(message) {
  return { code: Code.SUCCESS, message };
}
const { db } = require("aircode");
const MessageDB = db.table("t_message");
const EventDB = db.table("t_event");
const PromptDB = db.table("t_prompt");
class AirCodeStorage {
  async clearAllBySessionId(sessionId) {
    return await MessageDB.where({ sessionId }).delete();
  }
  async isSameEvent(eventId) {
    if (!eventId)
      return false;
    const count = await EventDB.where({ eventId }).count();
    if (count === 0)
      await EventDB.save({ eventId });
    return count > 0;
  }
  async findMessagesBySessionId(sessionId) {
    return await MessageDB.where({ sessionId }).sort({ createdAt: 1 }).find();
  }
  async findLastMessagesBySessionId(sessionId) {
    return await MessageDB.where({ sessionId }).sort({ createdAt: -1 }).findOne();
  }
  async saveMessage(data) {
    return await MessageDB.save(data);
  }
  async clearEventData() {
    const from = new Date(Date.now() - 3 * 60 * 60 * 1e3);
    return await EventDB.where({
      createdAt: db.lt(from)
    }).delete();
  }
  async findPromptByTitle(title) {
    return await PromptDB.where({ title }).findOne();
  }
}
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || "";
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || "";
const FEISHU_BOT_NAME = process.env.FEISHU_BOT_NAME || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_API_MODEL = process.env.OPENAI_API_MODEL || "" || Models.GPT3;
const OPENAI_MODEL_MAX_TOKEN = Number(
  process.env.OPENAI_MODEL_MAX_TOKEN ?? "" ?? 4096
);
const POST_URL = process.env.POST_URL || "";
class Controller {
  constructor(storage, ai, messageCenter) {
    __publicField(this, "storage");
    __publicField(this, "messageCenter");
    __publicField(this, "ai");
    this.messageCenter = messageCenter;
    this.storage = storage;
    this.ai = ai;
  }
  get isInnerCommand() {
    const commands = ["/end", "/help"];
    return commands.includes(this.messageCenter.content);
  }
  async handleCardMessage(params) {
    const { type, data } = await this.messageCenter.onCardMessageCommand(params);
    if (POST_URL) {
      axios.post(POST_URL, data);
    } else {
      await this[type]();
    }
  }
  async onMessage() {
    try {
      if (this.messageCenter.notMentionedGroupMessage)
        return;
      const sameEvent = await this.storage.isSameEvent(this.messageCenter.eventId);
      if (sameEvent)
        return;
      if (!this.messageCenter.isTextMessage) {
        await this.messageCenter.replyTextMessage("仅支持回复纯文本类型的消息");
        return;
      }
      if (this.isInnerCommand) {
        const command = this.messageCenter.content.substring(1);
        await this[command]();
        return;
      }
      await this.sendAIMessage();
    } catch (error) {
      console.log(`ID:onMessage，error：`, error);
    }
  }
  async transformByPrompt(question) {
    const matches = question.match(/^#(.+?)\s(.*)/);
    if (!matches)
      return question;
    const title = matches[1];
    const rest = matches[2];
    if (!rest)
      return question;
    const data = await this.storage.findPromptByTitle(title);
    if (!data)
      return question;
    return data.prompt.replace("{content}", rest);
  }
  async sendAIMessage() {
    const sessionId = this.messageCenter.sessionId;
    const question = await this.transformByPrompt(this.messageCenter.content);
    const historyList = await this.storage.findMessagesBySessionId(sessionId);
    const title = `本轮会话第${historyList.length + 1}回合`;
    await Promise.all([
      this.messageCenter.sendUniqueCardMessage({
        title,
        content: "思考中，请稍候…",
        throttle: false
      }),
      this.finishLastState(historyList[historyList.length - 1])
    ]);
    await this.ai.getAnswer(historyList, question, async (data) => {
      if (!data.content && !data.finished)
        return;
      const content = data.fullContent;
      if (!data.finished) {
        await this.messageCenter.sendUniqueCardMessage({ title, content, throttle: true });
        return;
      }
      console.log(`ID:102，data.fullContent：`, content);
      await this.messageCenter.sendUniqueCardMessage({
        title,
        content,
        throttle: true,
        actions: [
          {
            btnText: "再问一遍",
            type: "onMessage",
            data: this.messageCenter.params
          },
          {
            btnText: "结束本轮会话",
            type: "end",
            data: {
              ...this.messageCenter.params,
              actionData: {
                title,
                content
              }
            }
          }
        ]
      });
      if (!data.isError) {
        await this.storage.saveMessage({
          sessionId: this.messageCenter.sessionId,
          question,
          answer: data.fullContent,
          cardMessageId: this.messageCenter.cardMessageId,
          sort: historyList.length + 1
        });
      }
    });
  }
  async finishLastState(last) {
    if (!(last == null ? void 0 : last.cardMessageId))
      return;
    return await this.messageCenter.updateCardMessageById(last.cardMessageId, {
      title: `本轮会话第${last.sort}回合`,
      content: last.answer
    });
  }
  async end() {
    const sessionId = this.messageCenter.sessionId;
    const last = await this.storage.findLastMessagesBySessionId(sessionId);
    await Promise.allSettled([
      this.finishLastState(last),
      this.messageCenter.sendTextMessage(
        "本轮会话已结束，非常感谢您的信任，如果您有其他的问题或需求，请随时联系我。"
      ),
      this.storage.clearAllBySessionId(sessionId)
    ]);
  }
  async help() {
    const cmds = ["1. /end   结束当前这一轮会话，以开始一轮新的会话", "2. /help  获取帮助信息"];
    await this.messageCenter.replyTextMessage(cmds.join("\n"));
  }
}
const { encode } = require("gpt-3-encoder");
function countToken(text) {
  return encode(text).length;
}
function countTokenByPrompts(prompts) {
  return prompts.reduce((total, item) => {
    total += 4;
    Object.entries(item).forEach(([key, value]) => {
      total += countToken(value);
      if (key === "name")
        total -= 1;
    });
    return total;
  }, 0);
}
function getMaxTokenByPrompts(prompts) {
  const totalTokens = countTokenByPrompts(prompts);
  return OPENAI_MODEL_MAX_TOKEN - totalTokens - 10;
}
const { Configuration, OpenAIApi } = require("openai");
let openai$1 = null;
function useOpenAI() {
  if (!openai$1) {
    const configuration = new Configuration({
      apiKey: OPENAI_API_KEY
    });
    openai$1 = new OpenAIApi(configuration);
  }
  return openai$1;
}
const openai = useOpenAI();
class Openai {
  async getAnswer(historyList, content, onProgress) {
    try {
      const messages = this.createPrompts(historyList, content);
      const max_tokens = getMaxTokenByPrompts(messages);
      const option = {
        model: OPENAI_API_MODEL,
        messages,
        max_tokens,
        stream: true,
        temperature: 0.8
      };
      logger(`ID:30，option：`, option);
      const res = await openai.createChatCompletion(option, {
        timeout: 2e4,
        responseType: "stream"
      });
      await this.readStream(res, onProgress);
    } catch (error) {
      const errorMsg = await this.onStreamError(error);
      onProgress({
        content: errorMsg,
        fullContent: errorMsg,
        finished: true,
        isError: true
      });
      return Promise.reject(errorMsg);
    }
  }
  readStream(res, onProgress) {
    let resultData;
    const contents = [];
    return new Promise((resolve, reject) => {
      res.data.on("data", (data) => {
        let lines = data.toString().split("\n");
        lines = lines.filter((line) => line.trim() !== "");
        for (const line of lines) {
          const message = line.replace(/^data: /, "");
          if (message === "[DONE]") {
            break;
          }
          try {
            resultData = JSON.parse(message);
            const { delta, finish_reason } = resultData.choices[0];
            const suffix = this.getSuffix(finish_reason);
            if (delta.content || suffix) {
              contents.push(`${delta.content ? delta.content : ""}${suffix ? suffix : ""}`);
              onProgress({
                finished: false,
                content: delta.content,
                fullContent: contents.join("")
              });
            }
          } catch (error) {
            console.error("Could not JSON parse stream message", message, error);
          }
        }
      });
      res.data.on("end", () => {
        onProgress({
          finished: true,
          content: "",
          fullContent: contents.join("")
        });
        resolve({ ...resultData, message: contents.join("") });
      });
    });
  }
  onStreamError(error) {
    return new Promise((resolve, reject) => {
      var _a;
      if (!((_a = error.response) == null ? void 0 : _a.status)) {
        console.error("error.message", error.message);
        return resolve(error.message);
      }
      console.error(error.response.status, error.message);
      error.response.data.on("data", (data) => {
        const message = data.toString();
        try {
          const parsed = JSON.parse(message);
          console.error("An error occurred during OpenAI request: ", parsed.error.message);
          return resolve(parsed.error.message);
        } catch (error2) {
          console.error("An error occurred during OpenAI request: ", message);
          return resolve("调用openai接口异常");
        }
      });
    });
  }
  getSuffix(reason) {
    const map = {
      content_filter: "（内容被AI部分过滤，未完整显示）",
      length: "（由于连续会话长度限制，内容未完整返回，请使用/end指令结束本轮会话，以便获取完整的回答）",
      null: ""
    };
    return map[reason] || "";
  }
  createPrompts(historyList, content) {
    const prompts = this.createFullPrompts(historyList, content);
    const user = prompts[prompts.length - 1];
    const minCount = countTokenByPrompts([user]);
    let count = Math.floor(OPENAI_MODEL_MAX_TOKEN * 0.9) - minCount;
    return prompts.filter((item, index) => {
      if (index === prompts.length - 1)
        return true;
      const curCount = countTokenByPrompts([item]);
      if (count - curCount > 0) {
        count -= curCount;
        return true;
      }
      count = -1;
      return false;
    });
  }
  createFullPrompts(historyList, content) {
    const prompts = historyList.reduce((prompts2, data) => {
      prompts2.push({ role: Roles.USER, content: data.question });
      prompts2.push({ role: Roles.ASSISTANT, content: data.answer });
      return prompts2;
    }, []);
    return [...prompts, { role: Roles.USER, content }];
  }
}
const Lark = require("@larksuiteoapi/node-sdk");
let larkClient = null;
function useClient() {
  if (!larkClient) {
    larkClient = new Lark.Client({
      appId: FEISHU_APP_ID,
      appSecret: FEISHU_APP_SECRET,
      disableTokenCache: false
    });
  }
  return larkClient;
}
function separateCodeBlocks(text) {
  const codeBlockReg = /^```([\w]+)?([\s\S]+?)^```$/gm;
  let match;
  let lastIndex = 0;
  const result = [];
  while (match = codeBlockReg.exec(text)) {
    if (lastIndex < match.index) {
      result.push({
        type: "text",
        content: text.slice(lastIndex, match.index)
      });
    }
    const languageType = match[1] ? match[1].trim() : "";
    const codeContent = match[2] ? match[2].trim() : "";
    result.push({
      type: "code",
      language: languageType,
      content: codeContent
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    result.push({
      type: "text",
      content: text.slice(lastIndex)
    });
  }
  return result;
}
function codeBlockToTemplate(content, language) {
  let noteElement = [];
  if (language) {
    noteElement = [
      {
        tag: "note",
        elements: [
          {
            tag: "plain_text",
            content: language
          }
        ]
      }
    ];
  }
  return {
    tag: "column_set",
    flex_mode: "none",
    background_style: "default",
    columns: [
      {
        tag: "column",
        width: "weighted",
        weight: 1,
        vertical_align: "top",
        elements: [
          {
            tag: "column_set",
            flex_mode: "none",
            background_style: "grey",
            columns: [
              {
                tag: "column",
                width: "weighted",
                weight: 1,
                vertical_align: "top",
                elements: [
                  ...noteElement,
                  {
                    tag: "div",
                    text: {
                      content,
                      tag: "plain_text"
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };
}
function plainTextToPlainText(plainTextContent) {
  return {
    tag: "div",
    text: {
      content: plainTextContent,
      tag: "plain_text"
    }
  };
}
function convertMarkdownToMsgJson(markdownText) {
  const parts = separateCodeBlocks(markdownText);
  const elements = [];
  for (const part of parts) {
    if (part.type === "code") {
      elements.push(codeBlockToTemplate(part.content, part.language));
    } else if (part.type === "text") {
      elements.push(plainTextToPlainText(part.content));
    }
  }
  return elements;
}
function throttlePromise(promiseFn, wait = 1e3) {
  let recent = 0;
  let busy = false;
  let params, timeout;
  return function(...args) {
    params = args;
    clearTimeout(timeout);
    const executeFn = () => {
      busy = true;
      promiseFn.apply(this, params).finally(() => {
        busy = false;
        recent = Date.now();
      });
    };
    const remainTime = wait - (Date.now() - recent);
    if (recent === 0 || remainTime > 0 || busy) {
      if (recent === 0)
        recent = Date.now();
      timeout = setTimeout(() => {
        executeFn();
      }, wait);
      return;
    }
    executeFn();
  };
}
function sleep(mills) {
  return new Promise((resolve) => {
    setTimeout(resolve, mills);
  });
}
class LarkCardMessage {
  constructor(replyMessageId) {
    __publicField(this, "replyMessageId");
    __publicField(this, "client", useClient());
    __publicField(this, "sendOrUpdateThrottle", null);
    __publicField(this, "cardMessageId");
    __publicField(this, "title");
    __publicField(this, "time");
    this.replyMessageId = replyMessageId;
    this.time = Date.now();
    console.log(`ID:16，this.replyMessageId：`, this.replyMessageId);
    this.sendOrUpdateThrottle = throttlePromise(this.sendOrUpdate, 1e3);
  }
  async sendCardMessage(option) {
    if (option.throttle) {
      return await this.sendOrUpdateThrottle(option);
    } else {
      return await this.sendOrUpdate(option);
    }
  }
  async sendOrUpdate(option) {
    console.log(`ID:81，累计耗时：`, (Date.now() - this.time) / 1e3);
    if (!this.cardMessageId) {
      return await this.replyCardMessage(option);
    } else {
      return await this.updateCardMessage(option);
    }
  }
  async replyCardMessage(option) {
    if (!option.content)
      return;
    try {
      const res = await this.client.im.message.reply({
        path: {
          message_id: this.replyMessageId
        },
        data: {
          content: this.createCardContent(option),
          msg_type: "interactive"
        }
      });
      logger(`ID:162，this.cardMessageId：`, this.cardMessageId);
      this.cardMessageId = res.data.message_id;
      return res;
    } catch (e) {
      logger("发送飞书卡片消息发生错误：", { e, option });
    }
  }
  async updateCardMessage(option, messageId, retryTimes = 0) {
    if (!option.content)
      return;
    const res = await this.client.im.message.patch({
      path: {
        message_id: messageId ?? this.cardMessageId
      },
      data: {
        content: this.createCardContent(option)
      }
    });
    if (res.code === 230020 && retryTimes < 10) {
      await sleep(200);
      return await this.updateCardMessage(option, messageId, retryTimes + 1);
    }
    if (res.code !== 0) {
      console.error(`ID:73，res：`, res);
    }
    return res;
  }
  createCardContent(option) {
    if (option.title)
      this.title = option.title;
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
  setTitle(data, option) {
    if (option.title)
      this.title = option.title;
    if (this.title) {
      data.header = {
        template: "blue",
        title: {
          tag: "plain_text",
          content: this.title
        }
      };
    }
  }
  setElements(data, option) {
    data.elements = convertMarkdownToMsgJson(option.content);
    const actions = option.actions ?? [];
    data.elements.push({
      tag: "action",
      actions: actions.map((item) => {
        return {
          tag: "button",
          text: {
            content: item.btnText,
            tag: "plain_text"
          },
          type: item.btnType || "default",
          value: {
            type: item.type,
            data: item.data
          }
        };
      })
    });
  }
}
const client = useClient();
class LarkMessageCenter {
  constructor(params) {
    __publicField(this, "params");
    __publicField(this, "message");
    __publicField(this, "header");
    __publicField(this, "larkCardMessage");
    this.params = params;
    this.header = params.header;
    this.message = params.event.message;
    this.larkCardMessage = new LarkCardMessage(this.messageId);
  }
  get eventId() {
    return this.header.event_id;
  }
  get messageId() {
    return this.message.message_id;
  }
  get sessionId() {
    return this.params.event.message.chat_id;
  }
  get content() {
    const data = JSON.parse(this.message.content);
    const mentionKeys = this.mentions.map((item) => item.key);
    return mentionKeys.reduce((text, key) => {
      return text.replace(key, "").trim();
    }, data.text);
  }
  get notMentionedGroupMessage() {
    const isGroupMsg = this.message.chat_type === "group";
    const notMentioned = this.mentions.every((item) => item.name !== FEISHU_BOT_NAME);
    return isGroupMsg && notMentioned;
  }
  get isTextMessage() {
    return this.message.message_type === "text";
  }
  get mentions() {
    var _a;
    return ((_a = this.message) == null ? void 0 : _a.mentions) || [];
  }
  async onCardMessageCommand(params) {
    const type = params.action.value.type;
    const content = type === "end" ? JSON.stringify({ text: "/end" }) : this.message.content;
    const data = this.createPostParams(content);
    return { type, data };
  }
  createPostParams(content) {
    return {
      schema: "2.0",
      header: {
        token: this.header.token,
        tenant_key: this.header.tenant_key,
        event_type: "im.message.receive_v1"
      },
      event: {
        message: {
          chat_id: this.message.chat_id,
          chat_type: this.message.chat_type,
          message_id: this.message.message_id,
          content: content ?? this.message.content,
          mentions: this.mentions,
          message_type: "text"
        },
        sender: this.params.event.sender
      }
    };
  }
  async replyTextMessage(text) {
    try {
      return await client.im.message.reply({
        path: {
          message_id: this.message.message_id
        },
        data: {
          content: JSON.stringify({ text }),
          msg_type: "text"
        }
      });
    } catch (e) {
      logger("发送飞书消息发生错误：", { e, params: this.params, text });
    }
  }
  async sendTextMessage(text) {
    try {
      return await client.im.message.create({
        data: {
          receive_id: this.message.chat_id,
          msg_type: "text",
          content: JSON.stringify({ text })
        },
        params: {
          receive_id_type: "chat_id"
        }
      });
    } catch (e) {
      logger("发送飞书消息发生错误：", { e, params: this.params, text });
    }
  }
  async sendUniqueCardMessage(option) {
    return await this.larkCardMessage.sendCardMessage(option);
  }
  async updateCardMessageById(messageId, option) {
    const cardMsg = new LarkCardMessage(void 0);
    return await cardMsg.updateCardMessage(option, messageId);
  }
  get cardMessageId() {
    return this.larkCardMessage.cardMessageId;
  }
}
async function aircodeFeishuOpenai(params, context) {
  var _a;
  console.log(`ID:1，params：`, params);
  console.log(`ID:2，context：`, context);
  if (((_a = params == null ? void 0 : params.header) == null ? void 0 : _a.event_type) === "im.message.receive_v1") {
    const messageCenter = new LarkMessageCenter(params);
    const ai = new Openai();
    const storage = new AirCodeStorage();
    const controller = new Controller(storage, ai, messageCenter);
    await controller.onMessage();
    return success();
  }
  if (params.action) {
    const messageCenter = new LarkMessageCenter(params.action.value.data);
    const ai = new Openai();
    const storage = new AirCodeStorage();
    const controller = new Controller(storage, ai, messageCenter);
    await controller.handleCardMessage(params);
    return success();
  }
  if (context.trigger === "SCHEDULE") {
    await new AirCodeStorage().clearEventData();
    return;
  }
  if (params.type === "url_verification") {
    return larkVerification(params);
  }
  return success();
}
module.exports = aircodeFeishuOpenai;
