## 特性
接入飞书机器人，支持连续问答，流失响应，富文本显示消息等特性，同时也支持预设提示词的功能。

## 源码仓库

欢迎提供优化建议、反馈BUG：[https://github.com/phoooob/chatgpt-office](https://github.com/phoooob/chatgpt-office)

## 部署文档

如有任何疑问欢迎评论提问：[点击查看部署文档](https://tf38wzf3i8.feishu.cn/docx/PEG4dxjcnotqb3xauqoc2KqinLg?from=from_copylink)

## 环境变量配置说明


*FEISHU_APP_ID*: 飞书的应用App ID

*FEISHU_APP_SECRET*: 飞书的应用的App Secret

*FEISHU_BOT_NAME*: 飞书机器人的名字

*OPENAI_API_KEY*: OpenAI的秘钥

*OPENAI_API_MODEL*: 使用的模型，默认为gpt-3.5-turbo

*OPENAI_MODEL_MAX_TOKEN*: 使用的模型最大TOKEN数量限制，默认为4096

*POST_URL*: 飞书消息交互行为回调地址，与飞书服务器回调地址一致

## 预设提示词
这是一个可选操作，用于预设提示词。
1. 手动在Database控制台创建`t_prompt`表，添加`title`、`prompt`字段。
2. 手动在该表中插入预设提示词数据，这里有一个示例：

```javascript
{
title:"sql",
prompt:"根据我提供的信息写出对应的创建数据表的sql语句，要求兼容mysql5.6，字段包含注释信息，如果字段有枚举值也要写到注释中：{content}，还有创建时间、更新时间，其中创建时间使用当前系统时间，更新时间也使用当前系统时间自动更新，表名以t_作为前缀。"
}
```


3. 发送消息时，需要以“#sql ”开头，然后追加内容即可，例如：
#sql 商品名称，商品分类，商品价格

## 定时任务
这是一个可选操作，用于清理无用的事件数据，请点击**Create a schedule job**按钮，为feishu-chat.js创建一个每天执行一次的定时任务。

## 数据表索引优化
这是一个可选操作，用于提高数据库性能，请按照以下指引添加数据表索引：

t_event表：
1. eventId: ASC，唯一索引
2. createdAt：DESC，普通索引

t_message表：
1. sessionId: ASC、createdAt: ASC，联合索引
2. sessionId: ASC，普通索引

t_prompt表：
1. title: ASC，普通索引