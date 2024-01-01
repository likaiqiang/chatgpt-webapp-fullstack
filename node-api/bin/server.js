#!/usr/bin/env node
/* eslint-disable no-undef */
import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { FastifySSEPlugin } from '@waylaidwanderer/fastify-sse-v2';
import fs from 'fs';
import { KeyvFile } from 'keyv-file';
import ChatGPTClient from '../src/ChatGPTClient.js';
import ChatGPTBrowserClient from '../src/ChatGPTBrowserClient.js';
import BingAIClient from '../src/BingAIClient.js';
import path,{dirname} from 'path'
import {fileURLToPath, pathToFileURL} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const settings = (await import(pathToFileURL(
    path.join(__dirname,'../settings.js')
).toString())).default;

const BillingURL = `${settings.chatGptClient.baseurl}/dashboard/billing/credit_grants`;


// if (settings.storageFilePath && !settings.cacheOptions.store) {
//     // make the directory and file if they don't exist
//     const dir = settings.storageFilePath.split('/').slice(0, -1).join('/');
//     if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, { recursive: true });
//     }
//     if (!fs.existsSync(settings.storageFilePath)) {
//         fs.writeFileSync(settings.storageFilePath, '');
//     }
//
//     settings.cacheOptions.store = new KeyvFile({ filename: settings.storageFilePath });
// }

const clientToUse = settings.apiOptions?.clientToUse || settings.clientToUse || 'chatgpt';

const perMessageClientOptionsWhitelist = settings.apiOptions?.perMessageClientOptionsWhitelist || null;

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
        const resp = await fetch(`${settings.chatGptClient.baseurl}/v1/models`,{
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
server.post('/api/usage', async (request, reply) => {
    const { hash } = request.body || {};
    if (hash !== 'magic-master') {
        reply.code(400).send('Auth Failed');
        return;
    }
    const configApiKey = settings.openaiApiKey || settings.chatGptClient.openaiApiKey;
    if (!configApiKey) {
        reply.code(500).send('Config Error');
        return;
    }
    console.log('query user credits...');
    if (configApiKey?.indexOf(',') > -1) {
        const keys = configApiKey.split(',');
        const promises = keys.map(k => fetch(
            BillingURL,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${k}`,
                },
            },
        )
            .then(resp => resp.json())
            .then(resp => ({
                id: k,
                credits: resp,
            }
            )));
        const resp = await Promise.all(promises);
        console.log('query done accounts: ', resp);
        reply.send(resp);
    } else {
        const resp = await fetch(
            BillingURL,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${configApiKey}`,
                },
                //   dispatcher: new ProxyAgent({
                //     uri: 'http:/127.0.0.1:58591'
                // }),
            },
        ).then(respTmp => respTmp.json())
            .then(respTmp => ({
                id: configApiKey,
                credits: respTmp,
            }));
        console.log('query done account: ', resp);
        reply.send(resp);
    }
});

server.post('/api/chat', async (request, reply) => {
    console.log('api chat message - ', JSON.stringify(request.body));

    const body = request.body || {};
    const abortController = new AbortController();

    reply.raw.on('close', () => {
        if (abortController.signal.aborted === false) {
            abortController.abort();
        }
    });

    let onProgress;
    if (body.stream === true) {
        onProgress = (token) => {
            if (settings.apiOptions?.debug) {
                console.debug(token);
            }
            if (token !== '[DONE]') {
                reply.sse({ id: '', data: JSON.stringify(token) });
            }
        };
    } else {
        onProgress = null;
    }

    let result;
    let error;
    try {
        if (!body.message) {
            const invalidError = new Error();
            invalidError.data = {
                code: 400,
                message: 'The message parameter is required.',
            };
            // noinspection ExceptionCaughtLocallyJS
            throw invalidError;
        }

        let clientToUseForMessage = clientToUse;
        const clientOptions = filterClientOptions(body.clientOptions, clientToUseForMessage);
        if (clientOptions && clientOptions.clientToUse) {
            clientToUseForMessage = clientOptions.clientToUse;
            delete clientOptions.clientToUse;
        }

        const messageClient = getClient(clientToUseForMessage, body.model || 'gpt4-1106-preview');
        let targetClient = messageClient;
        if (Array.isArray(messageClient)) {
            targetClient = messageClient[Math.floor(Math.random() * messageClient.length)];
        }
        result = await targetClient.sendMessage(body.message, {
            jailbreakConversationId: body.jailbreakConversationId ? body.jailbreakConversationId.toString() : undefined,
            conversationId: body.conversationId ? body.conversationId.toString() : undefined,
            parentMessageId: body.parentMessageId ? body.parentMessageId.toString() : undefined,
            conversationSignature: body.conversationSignature,
            clientId: body.clientId,
            invocationId: body.invocationId,
            userId: body.userId,
            clientOptions,
            onProgress,
            abortController,
        });
    } catch (e) {
        error = e;
    }

    if (result !== undefined) {
        if (settings.apiOptions?.debug) {
            console.debug(result);
        }
        if (body.stream === true) {
            reply.sse({ event: 'result', id: '', data: JSON.stringify(result) });
            reply.sse({ id: '', data: '[DONE]' });
            await nextTick();
            reply.raw.end();
            return;
        }
        reply.send(result);
        return;
    }

    const code = error?.data?.code || 503;
    if (code === 503) {
        console.error(error);
    } else if (settings.apiOptions?.debug) {
        console.debug(error);
    }
    const message = error?.data?.message || `There was an error communicating with ${clientToUse === 'bing' ? 'Bing' : 'ChatGPT'}.`;
    if (body.stream === true) {
        reply.sse({
            id: '',
            event: 'error',
            data: JSON.stringify({
                code,
                error: message,
            }),
        });
        await nextTick();
        reply.raw.end();
        return;
    }
    reply.code(code).send({ error: message });
});

const port = settings.apiOptions?.port || settings.port || 3000;

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

function getClient(clientToUseForMessage, model) {
    switch (clientToUseForMessage) {
        case 'bing':
            return new BingAIClient(settings.bingAiClient);
        case 'chatgpt-browser':
            return new ChatGPTBrowserClient(
                settings.chatGptBrowserClient,
                settings.cacheOptions,
            );
        case 'chatgpt':
            settings.cacheOptions.namespace = settings.cacheOptions.namespace || 'chatgpt';
            // eslint-disable-next-line no-case-declarations
            const configApiKey = getConfigApiKey()
            console.log('api key - ', configApiKey);
            const opts = Object.assign({},settings.chatGptClient)
            opts.modelOptions.model = model

            return new ChatGPTClient(
                configApiKey,
                opts,
                settings.cacheOptions,
                settings.chatGptClient.baseurl
            );
        default:
            throw new Error(`Invalid clientToUse: ${clientToUseForMessage}`);
    }
}

/**
 * Filter objects to only include whitelisted properties set in
 * `settings.js` > `apiOptions.perMessageClientOptionsWhitelist`.
 * Returns original object if no whitelist is set.
 * @param {*} inputOptions
 * @param clientToUseForMessage
 */
function filterClientOptions(inputOptions, clientToUseForMessage) {
    if (!inputOptions || !perMessageClientOptionsWhitelist) {
        return null;
    }

    // If inputOptions.clientToUse is set and is in the whitelist, use it instead of the default
    if (
        perMessageClientOptionsWhitelist.validClientsToUse
        && inputOptions.clientToUse
        && perMessageClientOptionsWhitelist.validClientsToUse.includes(inputOptions.clientToUse)
    ) {
        clientToUseForMessage = inputOptions.clientToUse;
    } else {
        inputOptions.clientToUse = clientToUseForMessage;
    }

    const whitelist = perMessageClientOptionsWhitelist[clientToUseForMessage];
    if (!whitelist) {
        // No whitelist, return all options
        return inputOptions;
    }

    const outputOptions = {};

    for (const property of Object.keys(inputOptions)) {
        const allowed = whitelist.includes(property);

        if (!allowed && typeof inputOptions[property] === 'object') {
            // Check for nested properties
            for (const nestedProp of Object.keys(inputOptions[property])) {
                const nestedAllowed = whitelist.includes(`${property}.${nestedProp}`);
                if (nestedAllowed) {
                    outputOptions[property] = outputOptions[property] || {};
                    outputOptions[property][nestedProp] = inputOptions[property][nestedProp];
                }
            }
            continue;
        }

        // Copy allowed properties to outputOptions
        if (allowed) {
            outputOptions[property] = inputOptions[property];
        }
    }

    return outputOptions;
}
