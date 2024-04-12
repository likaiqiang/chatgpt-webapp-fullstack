#!/usr/bin/env node
/* eslint-disable no-undef */
import 'dotenv/config'
import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { FastifySSEPlugin } from '@waylaidwanderer/fastify-sse-v2';
import fs from 'fs';

import OpenAI from 'openai';
import crypto from "crypto";
import { encodingForModel } from 'js-tiktoken';
import cheerio from 'cheerio'
import readability from 'node-readability'
import util from 'util'
import {getConfigApiKey} from './pool.js'
import KeyvMongoDB from "./keyv-mongodb.js";

const conversationsCache = new KeyvMongoDB()


const read = util.promisify(readability);

function getMaxToken(modelName) {
    const models = {
        'gpt-4-0125-preview': 128000,
        'gpt-3.5-turbo-0125': 16385,
        'gpt-3.5-turbo-1106': 16385,
        'gpt-3.5-turbo': 4096,
        'gpt-3.5-turbo-16k': 16385,
        'gpt-3.5-turbo-instruct': 4096,
        'gpt-3.5-turbo-0613': 4096,
        'gpt-3.5-turbo-16k-0613': 16385,
        'gpt-3.5-turbo-0301': 4096,
        'text-davinci-003': 4096,
        'text-davinci-002': 4096,
        'code-davinci-002': 8001,
        'gpt-4-1106-preview': 128000,
        'gpt-4-vision-preview': 128000,
        'gpt-4': 8192,
        'gpt-4-32k': 32768,
        'gpt-4-0613': 8192,
        'gpt-4-32k-0613': 32768,
        'gpt-4-0314': 8192,
        'gpt-4-32k-0314': 32768,
        'text-embedding-ada-002': 8191
    };
    return models[modelName] || -1;
}

function splitByToken(modelName,text) {
    const maxToken = getMaxToken(modelName)
    const enc = encodingForModel(modelName)
    let currentLength = 0, currentText = ''

    for(const ct of text){
        const length = enc.encode(ct).length
        if(currentLength + length > maxToken){
            break
        }
        else{
            currentLength += length
            currentText += ct
        }
    }
    return currentText
}

function convertRelativeLinksToAbsolute({owner, repo, branch ,path, markdownContent}) {
    const protocol = 'https://'
    const filePath = path.startsWith('http') ? path : (protocol + path)

    const baseUrl = new URL( filePath )
    // 使用正则表达式匹配Markdown中的链接
    const regex = /\]\((.*?)\)/g;
    let match;

    // 遍历所有的链接
    while ((match = regex.exec(markdownContent)) !== null) {
        const link = match[1];

        // 检查链接是否是相对地址
        if (link && !link.startsWith('http')) {
            const combinePath = new URL(link, baseUrl).href.slice(protocol.length)
            const combineUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${combinePath}`

            // 在Markdown内容中替换相对地址为绝对地址
            markdownContent = markdownContent.replace(link, combineUrl);
        }
    }

    return markdownContent;
}

async function getGithubFileContent(owner, repo, branch ,path, model){
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    try {
        const text = await fetch(url).then(res=>res.text())
        return {
            content: splitByToken(
                model,
                convertRelativeLinksToAbsolute({
                    owner,
                    repo,
                    path,
                    branch,
                    markdownContent: text
                }))
        }
    } catch (error) {
        console.error('Error fetching file:', error.message);
    }
}

async function fetchUrl(url, model){
    return read(url).then(article=>{
        const {title, content} = article
        article.close();

        const $ = cheerio.load(content);
        const text = $.text()
        return {
            title,
            content: splitByToken(model, text)
        }
    })
}

async function webSearch(query){
    let subscription_key = process.env.BING_SUBSCRIPTION_KEY
    let mkt = 'en-US';
    let params = {q: query, mkt: mkt};
    let headers = {'Ocp-Apim-Subscription-Key': subscription_key};

    const queryString = Object.keys(params)
        .map(key => key + '=' + encodeURIComponent(params[key]))
        .join('&')

    return fetch(`https://api.bing.microsoft.com/v7.0/search?${queryString}`,{
        headers
    }).then(async res=>{
        const resp = await res.json()
        return resp.webPages.value.map(value=>{
            return {
                title: value.name,
                link: value.url,
                snippet: value.snippet
            }
        })
    })
}

const getOpenaiInstance = async (token)=>{
    return new OpenAI({
        baseURL: process.env.OPENAI_BASEURL,
        apiKey: token
    })
}

const getResponseFromFC = async ({toolCalls,content,model,stream,assistantMessage})=>{
    console.log('model',model)
    const messages = [
        {
            role:'user',
            content: content
        },
        assistantMessage
    ]
    for(const tool of toolCalls){
        const funcName = tool.function.name
        const arg = JSON.parse(tool.function.arguments)
        if(funcName === 'search_web'){
            messages.push({
                tool_call_id: tool.id,
                role: "tool",
                name: funcName,
                content: JSON.stringify(await webSearch(arg.query)),
            })
        }
        if(funcName === 'fetch_url'){
            messages.push({
                tool_call_id: tool.id,
                role: "tool",
                name: funcName,
                content: JSON.stringify(await fetchUrl(arg.url, model))
            })
        }
        if(funcName === 'get_github_file_content'){
            messages.push({
                tool_call_id: tool.id,
                role: "tool",
                name: funcName,
                content: JSON.stringify(await getGithubFileContent(arg.owner, arg.repo, arg.branch, arg.path, model))
            })
        }
    }
    const tokenHandler  = await getConfigApiKey()
    return tokenHandler.execute(async token=>{
        const openai = await getOpenaiInstance(token)
        return openai.chat.completions.create({
            model,
            messages,
            stream
        })
    })
}

const tools = [
    {
        "type": "function",
        "function":{
            "name": "get_github_file_content",
            "description": "在用户寻求某个托管在github上的文件内容时调用，参数有多个: owner、repo、branch、path",
            "parameters": {
                "type": "object",
                "properties": {
                    "owner": {
                        "type": "string",
                        "description": "github仓库的所有者",
                    },
                    "repo": {
                        "type": "string",
                        "description": "github仓库的名称",
                    },
                    "branch": {
                        "type": "string",
                        "description": "github分支名",
                    },
                    "path":{
                        "type": "string",
                        "description": "文件在github中的路径",
                    }
                },
                "required": ["owner","repo","branch","path"],
            },
            // @ts-ignore
            "return":{
                "type":"object",
                "properties":{
                    "content":{
                        "type":"string",
                        "description":"文件的内容"
                    }
                }
            }
        }
    },
    {
        "type":"function",
        "function":{
            "name":"fetch_url",
            "description":"在用户寻求某个网址时请求网页的内容，参数是一个 web url",
            "parameters":{
                "type": "object",
                "properties":{
                    "url": {
                        "type": "string",
                        "description": "请求的网址",
                    }
                },
                "required": ["url"],
            },
            // @ts-ignore
            "return":{
                "type":"object",
                "properties":{
                    "title":{
                        "type":"string",
                        "description":"网页的标题"
                    },
                    "content":{
                        "type":"string",
                        "description":"网页的主要内容"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function":{
            "name": "search_web",
            "description": "在用户寻求信息或者搜索结果可能有帮助的时候进行网上搜索, 参数是一个可能的搜索关键字或者句子",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜素关键字",
                    },
                },
                "required": ["query"],
            },
            // @ts-ignore
            "return":{
                "type":"array",
                "items":{
                    "type":"object",
                    "properties": {
                        "link": {
                            "type": "string",
                            "description": "搜索结果的url"
                        },
                        "title": {
                            "type": "string",
                            "description": "搜索结果的标题"
                        },
                        "snippet":{
                            "type":"string",
                            "description":"搜索结果的摘要"
                        }
                    },
                    "required": ["link","title"]
                }
            }
        }
    }
]


const server = fastify();

await server.register(FastifySSEPlugin);

await server.register(fastifyStatic, {
    root: fs.realpathSync('.'),
    prefix: '/',
});

await server.register(cors, {
    origin: 'http://127.0.0.1:3000'
});

server.get('/', async (req, res) => {
    res.code(200);
    res.send('ok');
});

server.get('/api/get_models', async (request, reply)=>{
    const tokenHandler  = await getConfigApiKey()
    await tokenHandler.execute(async token=>{
        try{
            const resp = await fetch(`${process.env.OPENAI_BASEURL}/models`,{
                headers:{
                    'Authorization': `Bearer ${token}`
                }
            }).then(res=>res.json())
            reply.send(resp)
            //reply.code(400).send('Auth Failed');
        } catch (e){
            reply.code(500).send(e.toString());
        }
    })

})

const formatMessages = (messages = [])=>{
    const msg = messages.map(message=>{
        if(message.role === 'ChatGPT'){
            return {
                role:'assistant',
                content: message.message
            }
        }
        if(message.role === 'User'){
            return {
                role: 'user',
                content: message.message
            }
        }
        return message
    })
    const currentDateString = new Date().toLocaleDateString(
        'en-us',
        { year: 'numeric', month: 'long', day: 'numeric' },
    );

    return [
        {
            role: 'system',
            content: `You are ChatGPT, a large language model trained by OpenAI. Respond conversationally.\nCurrent date: ${currentDateString}\n\n`
        },
        ...msg
    ]
}
server.post('/api/chat', async (request, reply)=>{

    console.log('api chat message - ', JSON.stringify(request.body));

    const body = request.body || {};

    const abortController = new AbortController();

    reply.raw.on('close', () => {
        if (abortController.signal.aborted === false) {
            abortController.abort();
        }
    });

    if (!body.message) {
        const invalidError = new Error();
        invalidError.data = {
            code: 400,
            message: 'The message parameter is required.',
        };
        // noinspection ExceptionCaughtLocallyJS
        throw invalidError;
    }
    const conversationId = body.conversationId || crypto.randomUUID();
    const parentMessageId = body.parentMessageId || crypto.randomUUID();
    const userId = body.userId
    const key = `${userId},${conversationId}`

    let conversation = await conversationsCache.get(key);
    if (!conversation) {
        conversation = {
            messages: [],
            createdAt: Date.now(),
        };
    }

    const userMessage = {
        id: crypto.randomUUID(),
        parentMessageId,
        role: 'User',
        message: body.message,
    };
    conversation.messages.push(userMessage);

    const messages = formatMessages(conversation.messages);

    const model = body.model || 'gpt-3.5-turbo-0125'
    const tokenHandler  = await getConfigApiKey()
    await tokenHandler.execute(async token=>{
        const openai = await getOpenaiInstance(token)

        try {
            const stream = await openai.chat.completions.create({
                model,
                messages,
                stream: body.stream,
                tools,
                tool_choice: 'auto',
            })
            let toolCalls = []
            let resultStream, content = '', assistantMessage = null
            if(body.stream){
                for await (const chunk of stream) {
                    if(chunk.choices[0]?.finish_reason === 'tool_calls') break

                    if(chunk.choices[0]?.delta?.tool_calls){
                        if(!assistantMessage) assistantMessage = chunk.choices[0]?.delta
                        if(toolCalls.length === 0){
                            toolCalls = chunk.choices[0]?.delta?.tool_calls || []
                        }
                        else{
                            for(const tool of (chunk.choices[0]?.delta?.tool_calls || [])){
                                const {index} = tool
                                toolCalls[index].function.arguments += tool.function.arguments || ''
                            }
                        }
                    }
                    else{
                        const ct = chunk.choices[0]?.delta?.content || ''
                        if(ct){
                            content += ct
                            reply.sse({ id: '', data: JSON.stringify(ct) });
                        }
                    }
                }
            }
            else{
                toolCalls = stream.choices[0]?.message?.tool_calls || []
                assistantMessage = stream.choices[0].message

                content = stream.choices[0]?.message?.content || ''
            }

            if(toolCalls.length){
                resultStream = await getResponseFromFC({
                    toolCalls,
                    content: body.message,
                    assistantMessage,
                    model,
                    stream: body.stream
                })
                if(body.stream){
                    for await (const chunk of resultStream){
                        const ct = chunk.choices[0]?.delta?.content || ''
                        content += ct
                        reply.sse({ id: '', data: JSON.stringify(ct) });
                    }
                }
                else {
                    content = resultStream.choices[0]?.message?.content || ''
                }
            }

            const replyMessage = {
                id: crypto.randomUUID(),
                parentMessageId: userMessage.id,
                role: 'ChatGPT',
                message: content,
            };
            conversation.messages.push(replyMessage);

            await conversationsCache.set(key, conversation);

            const result = {
                response: content,
                conversationId,
                messageId: replyMessage.id
            }

            if (body.stream) {
                reply.sse({ event: 'result', id: '', data: JSON.stringify(result)});
                reply.sse({ id: '', data: '[DONE]' });
                await nextTick();
                reply.raw.end();
                return;
            }
            reply.send(result);
        } catch (e){
            console.log('error',e)
            reply.send(e)
        }
    })

})

const port = 9000;

server.listen({
    port,
    host: '127.0.0.1',
}, (error) => {
    console.log('server started: ', port);
    if (error) {
        console.error(error);
        process.exit(1);
    }
});

function nextTick() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

