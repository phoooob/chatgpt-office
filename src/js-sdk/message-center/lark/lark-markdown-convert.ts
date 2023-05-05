/**
 * 将markdown文本中的代码块和非代码块分离
 */
function separateCodeBlocks(text) {
    const codeBlockReg = /^```([\w]+)?([\s\S]+?)^```$/gm; // 匹配代码块的正则表达式
    let match;
    let lastIndex = 0;
    const result = [];
    while ((match = codeBlockReg.exec(text))) {
        if (lastIndex < match.index) {
            result.push({
                type: 'text',
                content: text.slice(lastIndex, match.index)
            });
        }

        const languageType = match[1] ? match[1].trim() : ''; // 代码语言类型
        const codeContent = match[2] ? match[2].trim() : ''; // 代码块内容
        result.push({
            type: 'code',
            language: languageType,
            content: codeContent
        });

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        result.push({
            type: 'text',
            content: text.slice(lastIndex)
        });
    }

    return result;
}

function codeBlockToTemplate(content: string, language: string) {
    let noteElement = [];
    if (language) {
        noteElement = [
            {
                tag: 'note',
                elements: [
                    {
                        tag: 'plain_text',
                        content: language
                    }
                ]
            }
        ];
    }
    return {
        tag: 'column_set',
        flex_mode: 'none',
        background_style: 'default',
        columns: [
            {
                tag: 'column',
                width: 'weighted',
                weight: 1,
                vertical_align: 'top',
                elements: [
                    {
                        tag: 'column_set',
                        flex_mode: 'none',
                        background_style: 'grey',
                        columns: [
                            {
                                tag: 'column',
                                width: 'weighted',
                                weight: 1,
                                vertical_align: 'top',
                                elements: [
                                    ...noteElement,
                                    {
                                        tag: 'div',
                                        text: {
                                            content,
                                            tag: 'plain_text'
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

function replaceMarkdownCodeBlock(markdownText) {
    const reg = /(`)(.*?)(`)/g;
    return markdownText.replace(reg, "<font color='grey'> $2 </font>");
}

function plainTextToPlainText(plainTextContent) {
    return {
        tag: 'div',
        text: {
            content: plainTextContent,
            tag: 'plain_text'
        }
    };
}

export function convertMarkdownToMsgJson(markdownText) {
    const parts = separateCodeBlocks(markdownText);
    const elements = [];
    for (const part of parts) {
        if (part.type === 'code') {
            elements.push(codeBlockToTemplate(part.content, part.language));
        } else if (part.type === 'text') {
            elements.push(plainTextToPlainText(part.content));
        }
    }
    return elements;
}
