import LarkCardMessage from '@/js-sdk/message-center/lark/lark-card-message';

export default async function (params, contetxt) {
    const markdown2 = `\`\`\`javascript
// 创建一个空的Map对象
let myMap = new Map();

// 添加键值对到Map中
myMap.set("apple", 3);
myMap.set("banana", 2);
myMap.set("orange", 5);

// 获取Map的大小
console.log(myMap.size); // 输出3

// 获取Map中指定键的值
console.log(myMap.get("apple")); // 输出3

// 检查Map中是否存在指定的键
console.log(myMap.has("banana")); // 输出true

// 删除Map中指定的键值对
myMap.delete("orange");

// 循环遍历Map中的键值对
myMap.forEach(function(value, key) {
  console.log(key + " = " + value);
});
// 输出：
// apple = 3
// banana = 2
\`\`\`

以上示例中，我们使用了\`set()\`方法向Map中添加键值对，使用\`get()\`方法获取指定键的值，使用\`has()\`方法检查键是否存在，使用\`delete()\`方法删除指定的键值对，使用\`forEach()\`方法循环遍历键值对。
    `;

    const larkCardMessage = new LarkCardMessage('om_89bf741fb6435fb315e5e909e230b7e3');
    const messageId = 'om_2cf80cbcd0161774199efec82d7936aa';
    await larkCardMessage.updateCardMessage(
        {
            title: '测试卡片',
            content: markdown2
        },
        messageId
    );
}
