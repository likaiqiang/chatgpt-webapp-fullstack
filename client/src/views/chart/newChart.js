import React, { useEffect, useState, useRef,useContext } from 'react';
import { Toast, Button, Modal, TextArea, SafeArea, NoticeBar } from 'antd-mobile'
import {PlayOutline, HeartOutline, LeftOutline, AntOutline} from 'antd-mobile-icons'
import {useLocation, useNavigate} from 'react-router-dom'
import Whether,{If,Else} from "../../components/Whether";
import { callBridge } from '../../ChatServiceBridge';
import Messages from './Messages';
import './Chat.css';
import Context from "../../context";

function ChatComponent(props) {
    const [question, setQuestion] = useState("");

    const {cache,setCache} = useContext(Context)

    // const [outMsgs, setOutMsgs] = useLocalStorage('chat-out-msgs', []);
    // // 人的提问
    // const [retMsgs, setRetMsgs] = useLocalStorage('chat-ret-msgs', []);
    // //AI的回答

    const [outMsgs,setOutMsgs] = useState([])
    const [retMsgs,setRetMsgs] = useState([])
    const [errorMsgs,setErrorMsgs] = useState([])

    const [msgId, setMsgId] = useState('');
    const [convId, setConvId] = useState('');
    const [typing, setTyping] = useState(false);

    const abortSignalRef = useRef(null);

    const messagesEndRef = useRef(null)

    const navigator = useNavigate()

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        console.log('scroll to bottom');
    }

    const genRandomMsgId = () => {
        return `msg-${new Date().valueOf()}-${Math.floor(Math.random() * 10)}`;
    }

    const inputQuestion = val => {
        setQuestion(val);
    }

    const onmessage = (msgObj) => {
        // { data: 'Hello', event: '', id: '', retry: undefined }
        scrollToBottom()
    }

    const onopen = () => {
        console.log('opened');
    }

    const onclose = () => {
    }
    const onerror = (message) => {
        setErrorMsgs([...errorMsgs,{
            id: genRandomMsgId(),
            msg:'ChatGPT 用量饱和，请稍后重试',
            timestamp: new Date().valueOf()
        }])
    }
    const onReply = async function(e){
        abortSignalRef.current = null
        setTyping(true);
        try {
            const callRes = await callBridge({
                data: {
                    message: question,
                    parentMessageId: msgId,
                    conversationId: convId,
                },
                onmessage,
                onopen,
                onclose,
                onerror,
                getSignal: (sig) => {
                    abortSignalRef.current = sig
                },
                debug: props.debug
            })
            setQuestion('');
            const { response, messageId, conversationId } = callRes || {}

            if (messageId) {
                setMsgId(messageId);
            }


            // TODO: Persist request feedback to mysql
            setTyping(false);
            setCache({
                [convId]:{
                    "chat-out-msgs": outMsgs,
                    "chat-ret-msgs": [...retMsgs, { id: messageId, msg: response, timestamp: new Date().valueOf() }]
                }
            })

            return callRes;
        } catch (error) {
            console.error('call service error: ', error);

            setTyping(false);
        }
    }
    const directChat = async function (e) {
        e.preventDefault();
        if (!question) {
            Toast.show({
                content: '请输入有效问题',
            })
            return;
        }

        setQuestion('');
        const newOutMsgs = [...outMsgs, { id: genRandomMsgId(), msg: question, timestamp: new Date().valueOf() }]
        setOutMsgs(newOutMsgs)

        abortSignalRef.current = null
        setTyping(true);
        // 向云服务发起调用
        try {
            const callRes = await callBridge({
                data: {
                    message: question,
                    parentMessageId: msgId,
                    conversationId: convId,
                },
                onmessage,
                onopen,
                onclose,
                onerror,
                getSignal: (sig) => {
                    abortSignalRef.current = sig
                },
                debug: props.debug
            })
            setQuestion('');
            console.log('client stream result: ', abortSignalRef.current, callRes);
            const { response, messageId, conversationId } = callRes || {}

            if (messageId) {
                setMsgId(messageId);
            }
            if (conversationId) {
                setConvId(conversationId);
            }

            // TODO: Persist request feedback to mysql
            setTyping(false);
            const newRetMsgs = [...retMsgs, { id: messageId, msg: response, timestamp: new Date().valueOf() }]
            setRetMsgs(newRetMsgs)
            if(conversationId){
                setCache({
                    ...cache,
                    [conversationId]:{
                        "chat-out-msgs": newOutMsgs,
                        "chat-ret-msgs": newRetMsgs
                    }
                })
            }

            return callRes;
        } catch (error) {
            console.error('call service error: ', error);
            setTyping(false);
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [retMsgs, outMsgs]);

    useEffect(() => {
        setTimeout(() => {
            scrollToBottom();
        }, 300)
    }, []);

    const onCancelChat = (e) => {
        e.preventDefault();
        console.log('=============user===cancel============');
        abortSignalRef.current?.abort();
        // TODO: Send cancel feedback to server
        setTyping(false);
    }

    return (<div className="container">
        <div className="chatbox">
            <div className="top-bar">
                <div style={{fontSize:'2em'}}>
                    <LeftOutline onClick={()=>{
                        navigator(-1)
                    }}/>
                </div>
                <div className="name">WebInfra</div>
            </div>
            <div className="middle" style={{ marginTop: '60px' }}>
                <div className="chat-container">
                    <Messages
                        retMsgs={retMsgs.map(item => { item && (item.type = 'incoming'); return item })}
                        outMsgs={outMsgs.map(item => { item && (item.type = 'outgoing'); return item })}
                        errorMsgs={errorMsgs.map(item => { item && (item.type = 'error'); return item })}
                        onReply={onReply}
                    />
                    <div className='chat-bottom-line' ref={messagesEndRef}></div>
                </div>
            </div>
            <div className="bottom-bar">

                <div className="chat">
                    {/* <Input type="text" value={question} onChange={inputQuestion} onEnterPress={directChat} placeholder="开始提问吧..." enterkeyhint="done" maxLength={300} autoFocus clearable /> */}
                    <TextArea placeholder='开始提问吧...'
                              value={question}
                              onChange={inputQuestion}
                              rows={1}
                              maxLength={300}
                              autoSize={{ minRows: 1, maxRows: 8 }}
                              showCount
                              autoFocus
                    />
                    <Whether value={typing}>
                        <div className="cancel-container">
                            <div className='cancel' onClick={onCancelChat}>
                                <svg stroke="currentColor" fill="none" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                                取消
                            </div>
                        </div>
                    </Whether>
                    <Whether value={typing}>
                        <If>
                            <div className="typing">
                                <div className="bubble">
                                    <div className="ellipsis one"></div>
                                    <div className="ellipsis two"></div>
                                    <div className="ellipsis three"></div>
                                </div>
                            </div>
                        </If>
                        <Else>
                            <div className="button-container">
                                <Button className='button' onClick={(e) => directChat(e)}  >
                                    <PlayOutline />
                                </Button>
                            </div>
                        </Else>
                    </Whether>
                </div>
            </div>
            <SafeArea position='bottom' />
        </div>
    </div>)
}

export default ChatComponent;
