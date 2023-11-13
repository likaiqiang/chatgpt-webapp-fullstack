import React, { useEffect, useState, useRef,useContext } from 'react';
import { Toast, Button, Modal, SafeArea, NoticeBar } from 'antd-mobile'
import {PlayOutline, HeartOutline, LeftOutline, DownlandOutline} from 'antd-mobile-icons'
import Whether,{If,Else} from "../../components/Whether";
import {callBridge, getFingerprint} from '../../ChatServiceBridge';
import Messages from './Messages';
import './Chat.css';
import Context from "../../context";
import {useLocation, useNavigate} from "react-router-dom";
import QS from "qs";
import {useLatest, useMemoizedFn} from "ahooks";
import TextArea from './TextArea'
import cloneDeep from "lodash.clonedeep";
import {useScrollToBottom} from "../../hooks";
import {exportData} from "../../utils";

function ChatComponent(props) {
    const [question, setQuestion] = useState("");
    const {cache,setCache} = useContext(Context)
    const {search} = useLocation()
    const {convId,title} = QS.parse(search.split('?').pop())

    const outMsgs = cache[convId]['chat-out-msgs'] || []
    const retMsgs = cache[convId]['chat-ret-msgs'] || []
    const retMsgsRef = useLatest(retMsgs)
    const outMsgsRef = useLatest(outMsgs)

    // const [outMsgs, setOutMsgs] = useLocalStorage('chat-out-msgs', []);
    // // 人的提问
    // const [retMsgs, setRetMsgs] = useLocalStorage('chat-ret-msgs', []);
    //AI的回答
    const [msgId, setMsgId] = useState(retMsgs[retMsgs.length-1].id);

    const [typing, setTyping] = useState(false);

    const [isError,setIsError] = useState(false)

    const abortSignalRef = useRef(null);

    const messagesEndRef = useRef(null)

    const navigator = useNavigate()



    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        console.log('scroll to bottom');
    }

    const {update:updateScroll}  = useScrollToBottom(scrollToBottom)

    const genRandomMsgId = () => {
        return `msg-${new Date().valueOf()}-${Math.floor(Math.random() * 10)}`;
    }

    const inputQuestion = val => {
        setQuestion(val);
    }

    const onclose = () => {

    }
    const onopen = useMemoizedFn(()=>{
        //历史聊天有会话id，所以需要id为null判断是否为正在输出的消息
        setCache({
            ...cache,
            [convId]:{
                "chat-out-msgs": outMsgs,
                "chat-ret-msgs": [...retMsgs, { id: null, msg: '', timestamp: new Date().valueOf(),done:false }]
            }
        })
    })
    const onmessage = useMemoizedFn((message)=>{
        if(typing){
            const chatRetMsgs = cloneDeep(retMsgsRef.current)
            let typingMsg = chatRetMsgs.pop()
            if(typingMsg){
                typingMsg = Object.assign({},typingMsg,{msg: typingMsg.msg + message})
                chatRetMsgs.push(typingMsg)
                setCache({
                    ...cache,
                    [convId]:{
                        "chat-out-msgs": outMsgsRef.current,
                        "chat-ret-msgs":chatRetMsgs
                    }
                })
            }
            updateScroll()
        }
    })
    const oncomplete = ({complete})=>{
        const {msgId,conversationId} = complete[0]
        setMsgId(msgId)
        const chatRetMsgs = cloneDeep(retMsgsRef.current)
        chatRetMsgs[chatRetMsgs.length - 1].id = msgId
        setCache({
            ...cache,
            [conversationId]:{
                "chat-out-msgs": outMsgsRef.current,
                "chat-ret-msgs": chatRetMsgs
            }
        })
        setIsError(false)
        setTyping(false)
    }
    const onerror = useMemoizedFn((message) => {
        Toast.show({
            icon: 'fail',
            content: '提问失败',
            maskClickable: false,
            duration: 2000,
        })
        const newRetMsgs = cloneDeep(retMsgsRef.current)
        if(newRetMsgs[newRetMsgs.length - 1].id === null){
            newRetMsgs.pop()
            setCache({
                ...cache,
                [convId]:{
                    "chat-out-msgs": outMsgs,
                    "chat-ret-msgs":newRetMsgs
                }
            })
        }
        setIsError(true)
    })
    const directChat = async function (e) {
        e && e.preventDefault();
        if (!question) {
            Toast.show({
                content: '请输入有效问题',
            })
            return;
        }
        setQuestion('');
        setIsError(false)

        const newOutMsgs = [...outMsgs, { id: genRandomMsgId(), msg: question, timestamp: new Date().valueOf() }]
        setCache({
            ...cache,
            [convId]: {
                "chat-out-msgs": newOutMsgs,
                "chat-ret-msgs": retMsgs
            }
        })
        abortSignalRef.current = null
        setTyping(true);
        // 向云服务发起调用
        callBridge({
            data: {
                message: question,
                parentMessageId: msgId,
                conversationId: convId,
                userId: await getFingerprint()
            },
            getSignal: (sig) => {
                abortSignalRef.current = sig
            }
        },{
            next(msgs){
                const open = msgs.filter(msg=>msg.type === 'open')
                const complete = msgs.filter(msg=>msg.type === 'complete')
                const message = msgs.filter(msg=>msg.type === 'message')
                if(open.length){
                    setCache({
                        ...cache,
                        [convId]:{
                            "chat-out-msgs": outMsgsRef.current,
                            "chat-ret-msgs": [...retMsgsRef.current, { id: null, msg: '', timestamp: new Date().valueOf(),done:false }]
                        }
                    })
                }
                if(message.length && complete.length){
                    setTimeout(()=>{
                        onmessage(
                            message.map(item=>item.message).join('')
                        )
                        if(complete.length){
                            setTimeout(()=>{
                                oncomplete({complete})
                            },0)
                        }
                    },0)
                }
                else{
                    if(message.length && !complete.length){
                        setTimeout(()=>{
                            onmessage(
                                message.map(item=>item.message).join('')
                            )
                        },0)
                    }
                    if(!message.length && complete.length){
                        setTimeout(()=>{
                            oncomplete({complete})
                        },0)
                    }
                }
            },
            error:onerror
        })
    }

    const messageRef = useRef()

    useEffect(() => {
        scrollToBottom()
    }, [retMsgs, outMsgs]);

    useEffect(() => {
        Promise.resolve().then(scrollToBottom)
    }, []);

    const onCancelChat = (e) => {
        e.preventDefault();
        console.log('=============user===cancel============');
        abortSignalRef.current?.abort();
        // TODO: Send cancel feedback to server
        setTyping(false);
    }
    const onKeyDown = useMemoizedFn((e)=>{
        if (e.ctrlKey && e.keyCode === 13) {
            // 这里是按下了ctrl + enter后要执行的代码
            directChat(e)
        }
    })
    const onReply = ({msg},e)=>{
        setQuestion(msg);
        setTimeout(()=>{
            directChat(e)
        },0)
    }
    return (<div className="container">
        <div className="chatbox">
            <div className="top-bar">
                <div style={{fontSize:'2em'}}>
                    <LeftOutline onClick={()=>{
                        navigator(-1)
                    }}/>
                </div>
                <div className="name">
                    <div>WebInfra</div>
                    <Whether value={title}>
                        {title}
                    </Whether>
                </div>
                <div style={{fontSize:'2em'}}>
                    <DownlandOutline onClick={()=>{
                        exportData({
                            retMsgs,
                            outMsgs,
                            cache,
                            convId,
                            screenshotsRef: messageRef.current.messagesContainerRef.current
                        })
                    }}/>
                </div>
            </div>
            <div className="middle" style={{ marginTop: '60px' }}>
                <div className="chat-container">
                    <Messages
                        retMsgs={retMsgs.map(item => { item && (item.type = 'incoming'); return item })}
                        outMsgs={outMsgs.map(item => { item && (item.type = 'outgoing'); return item })}
                        onReply={onReply}
                        isError={isError}
                        ref={messageRef}
                    />
                    <div className='chat-bottom-line' ref={messagesEndRef}></div>
                </div>
            </div>
            <div className="bottom-bar">

                <div className="chat">
                    {/* <Input type="text" value={question} onChange={inputQuestion} onEnterPress={directChat} placeholder="开始提问吧..." enterkeyhint="done" maxLength={300} autoFocus clearable /> */}
                    <TextArea antdProps={{
                        placeholder:'开始提问吧...',
                        value: question,
                        onChange:inputQuestion,
                        rows:1,
                        maxLength:30000,
                        autoSize:{ minRows: 1, maxRows: 20 },
                        showCount: true,
                        autoFocus: false
                    }} onKeyDown={onKeyDown}/>
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
