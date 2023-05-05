import { AI, MessageData, OnProgress } from '@/js-sdk/typings';

export default class MockAI implements AI {
    getAnswer(historyList: Array<MessageData>, content: string, onProgress: OnProgress): Promise<void> {
        const index = 0;
        const timer = setInterval(() => {
            const data = this.mockData(index);
            onProgress(data);
            if (data.finished) clearInterval(timer);
        }, 1000);
        return Promise.resolve(undefined);
    }

    private mockData(index: number) {
        const content = (
            '我们可以使用 `setInterval()` 函数来创建定时器。\n' +
            '\n' +
            '`setInterval()` 函数接受两个参数：一个表示要执行的函数，另一个表示函数执行的间隔时间（以毫秒为单位）。\n' +
            '\n' +
            '下面是一个创建定时器的示例代码：\n' +
            '\n' +
            '```javascript\n' +
            '// 每隔1秒输出一次时间\n' +
            'const timer = window.setInterval(function(){\n' +
            '  console.log(new Date().toLocaleTimeString());\n' +
            '}, 1000);\n' +
            '```\n' +
            '\n' +
            '这里 `window.setInterval()` 函数创建了一个定时器 `timer`，它每隔1秒就会执行一次传入的函数。我们可以根据需要，自定义要执行的函数和时间间隔。 \n' +
            '\n' +
            '我们可以使用 `clearInterval()` 函数来清除定时器。示例代码如下：\n' +
            '\n' +
            '```javascript\n' +
            '// 清除定时器\n' +
            'window.clearInterval(timer);\n' +
            '``` \n' +
            '\n' +
            '在调用 `clearInterval()` 函数时传入定时器的名称，就可以停止定时器的执行。'
        ).split('\n');
        const finished = index >= content.length - 1;
        return {
            fullContent: content.filter((_, i) => i <= index).join(''),
            finished
        };
    }
}
