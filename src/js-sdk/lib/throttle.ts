export function throttlePromise(promiseFn, wait = 1000) {
    let recent = 0;
    let busy = false;
    let params, timeout;
    return function (...args) {
        params = args;
        clearTimeout(timeout);

        //执行promise的逻辑
        const executeFn = () => {
            busy = true;
            // @ts-ignore
            promiseFn.apply(this, params).finally(() => {
                busy = false;
                recent = Date.now();
            });
        };

        //第一次触发时，暂不执行；如果waitTime不足，则不执行；如果正在执行一个promise，则不再执行。启动一个兜底的计时器
        const remainTime = wait - (Date.now() - recent);
        if (recent === 0 || remainTime > 0 || busy) {
            if (recent === 0) recent = Date.now();
            timeout = setTimeout(() => {
                executeFn();
            }, wait);
            return;
        }

        //开始执行
        executeFn();
    };
}
