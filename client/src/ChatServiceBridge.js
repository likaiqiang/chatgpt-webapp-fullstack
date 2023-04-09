// Run the server first with `npm run server`
import {fetchEventSource} from '@fortaine/fetch-event-source';
import {bufferCount} from 'rxjs/operators';
import {Observable} from 'rxjs'
import {HOST_URL} from './config'

export const callBridge = (options, {
    next = () => {
    }, error = () => {
    }, complete = () => {
    }
}) => {
    const {
        data, getSignal, cb = () => {
        }
    } = options || {}
    if (!data?.message) {
        throw new Error('Empty Input Message');
    }
    const opts = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...(data || {}),
            // Set stream to true to receive each token as it is generated.
            stream: true,
        }),
    };

    const controller = new AbortController();
    if (getSignal) {
        getSignal(controller);
    }
    let msgId = '', conversationId = '', reply = '', sub = null

    let source = new Observable(obsrver => {
        const promise = fetchEventSource(`${HOST_URL}/api/chat`, {
            ...opts,
            signal: controller.signal,
            onopen() {
                obsrver.next({
                    type: 'open'
                })
            },
            onmessage(message) {
                if (message.data === '[DONE]') {

                } else {
                    const msg = JSON.parse(message.data)
                    if (typeof msg === 'string') {
                        obsrver.next({
                            type: 'message',
                            message: msg,
                        })
                    } else {
                        msgId = msg.messageId || ''
                        conversationId = msg.conversationId || ''
                        reply = msg.response
                    }
                }
            },
            onerror: obsrver.error,
            onclose: () => {

            }
        })
        promise.catch(error=>{
            console.log('error',error);
        }).finally(()=>{
            console.log('promise complete')
            obsrver.next({
                type: 'complete',
                msgId,
                conversationId,
                reply
            })
            obsrver.complete()
            controller.abort();
        })
    })
    source.pipe(bufferCount(5)).subscribe({
        next,
        error,
        complete
    })
}
