#!/usr/bin/env node
/* eslint-disable no-undef */
import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { FastifySSEPlugin } from '@waylaidwanderer/fastify-sse-v2';
import fs from 'fs';

import path,{dirname} from 'path'
import {fileURLToPath, pathToFileURL} from 'url';
import OpenAI from 'openai';
import crypto from "crypto";
import KeyvMongoDB from "../src/keyv-mongodb.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const conversationsCache = new KeyvMongoDB()

const settings = (await import(pathToFileURL(
    path.join(__dirname,'../settings.js')
).toString())).default;


async function webSearch(query){
    let subscription_key = settings.search.bing.subscription_key;
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

const getOpenaiInstance = ()=>{
    const configApiKey = getConfigApiKey()
    const baseUrl = settings.chatGptClient.baseurl

    return new OpenAI({
        apiKey: configApiKey,
        baseURL:baseUrl
    })
}

const requestFunc = async ({functionCall, functionResult, model, content, stream})=>{
    const openai = getOpenaiInstance()
    return openai.chat.completions.create({
        model,
        messages:[
            {
                role:'user',
                content: content
            },
            {
                role:'assistant',
                content: JSON.stringify(functionCall)
            },
            {
                role:'function',
                content: JSON.stringify(functionResult),
                name: functionCall.name
            }
        ],
        stream
    })
}

const getResponseFromFC = async ({functionCall,content,model,stream})=>{

    if(functionCall.name === 'search_web'){
        const query = JSON.parse(functionCall.arguments).query
        const searchItems =  await webSearch(query)
        return requestFunc({
            functionCall,
            functionResult: searchItems,
            content,
            model,
            stream
        })
    }
}

const functions = [
    {
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
]


const server = fastify();

await server.register(FastifySSEPlugin);

await server.register(fastifyStatic, {
    root: fs.realpathSync('.'),
    prefix: '/',
});

await server.register(cors, {
    origin: '*',
});

server.get('/', async (req, res) => {
    res.code(200);
    res.send('ok');
});

server.get('/api/get_models', async (request, reply)=>{
    const configApiKey = getConfigApiKey()
    try{
        const resp = await fetch(`${settings.chatGptClient.baseurl}/models`,{
            headers:{
                'Authorization': `Bearer ${configApiKey}`
            }
        }).then(res=>res.json())
        reply.send(resp)
        //reply.code(400).send('Auth Failed');
    } catch (e){
        reply.code(500).send(e.toString());
    }
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

    const model = body.model || 'gpt-3.5-turbo-1106'
    const openai = getOpenaiInstance()

    try {
        const stream = await openai.chat.completions.create({
            model,
            messages,
            stream: body.stream,
            functions,
            function_call: 'auto',
        })
        let functionCall = {
            name:'',
            arguments:''
        }
        let resultStream, content = ''
        if(body.stream){
            for await (const chunk of stream) {
                if(chunk.choices[0]?.delta?.function_call?.name){
                    functionCall.name = chunk.choices[0]?.delta?.function_call?.name ?? ''
                }
                if(chunk.choices[0]?.delta?.function_call?.arguments){
                    functionCall.arguments += chunk.choices[0]?.delta?.function_call?.arguments ?? ''
                }
                if(chunk.choices[0]?.finish_reason === 'function_call') break
                const ct = chunk.choices[0]?.delta?.content || ''
                if(ct){
                    content += ct
                    reply.sse({ id: '', data: JSON.stringify(ct) });
                }
            }
        }
        else{
            functionCall = stream.choices[0]?.message?.function_call || {
                name:'',
                arguments: ''
            }
            content = stream.choices[0]?.message?.content || ''
        }

        if(functionCall.name){
            resultStream = await getResponseFromFC({
                functionCall,
                content: body.message,
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
            else{
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
        reply.send(e)
    }
})

const port = 3007;

server.listen({
    port,
    host: settings.apiOptions?.host || 'localhost',
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

function getConfigApiKey(){
    let configApiKey = settings.openaiApiKey || settings.chatGptClient.openaiApiKey;
    if (!configApiKey) {
        throw new Error('Api Key not config');
    }
    if (configApiKey?.indexOf(',') > -1) {
        const keys = configApiKey.split(',');
        configApiKey = keys[Math.floor(Math.random() * keys.length)];
    }
    return configApiKey
}

