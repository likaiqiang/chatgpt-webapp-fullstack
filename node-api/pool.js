import genericPool from 'generic-pool'

// 假定这是您的token数组
const tokens = process.env.OPENAI_APIKEY.split(',')

const tokenFactory = {
    create: function() {
        // 从数组中取出一个token
        if (tokens.length > 0) {
            let token = tokens.shift(); // 移除并返回数组的第一个token
            return Promise.resolve({token: token});
        } else {
            // 没有可用token时，返回null或相应的错误
            return Promise.reject(new Error('No tokens available'));
        }
    },
    destroy: function(tokenObject) {
        // 归还token到数组
        tokens.push(tokenObject.token);
        return Promise.resolve();
    }
};

const myTokenPoolOptions = {
    max: tokens.length,  // 根据实际的token数量设置最大资源数
    min: 1,  // 根据需要设置最小资源数，这里假设为2
    acquireTimeoutMillis: 10000,  // 获取token的超时时间（毫秒）
    evictionRunIntervalMillis: 10000,  // 池中资源的检测间隔（毫秒）
    numTestsPerEvictionRun: tokens.length,  // 每次检测时，检测的资源数
    softIdleTimeoutMillis: 30000,  // 资源在多久后可以被回收（毫秒）
    idleTimeoutMillis: 30000  // 资源闲置多久后可以被释放（毫秒）
};

export const TokenPool = genericPool.createPool(tokenFactory, myTokenPoolOptions);

export async function getConfigApiKey(){
    const configApiKey = process.env.OPENAI_APIKEY
    if (!configApiKey) {
        return new Promise.reject('Api Key not config')
    }
    return TokenPool.acquire().then(tokenObject=>{
        return {
            execute: async function(taskFunction){
                try {
                    const result = await taskFunction(tokenObject.token);
                    return result;
                } catch (e){
                    return e
                } finally {
                    TokenPool.release(tokenObject);
                }
            }
        }
    })
}

export async function clear(){
    return TokenPool.drain().then(() => TokenPool.clear())
}
