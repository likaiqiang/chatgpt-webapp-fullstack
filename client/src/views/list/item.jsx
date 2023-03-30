import {Card, Modal, Toast, Input} from "antd-mobile";
import { Popper } from "react-popper";
import {AntOutline, RightOutline} from "antd-mobile-icons";
import {useLongPress, useMemoizedFn} from 'ahooks';
import {useContext, useRef, forwardRef, useImperativeHandle, useEffect, useState} from "react";
import {useNavigate,useLocation} from "react-router-dom";
import cloneDeep from 'lodash.clonedeep'
import Context from '../../context'
import {useImmer} from "use-immer";
import Whether from "../../components/Whether";
import DataFor from "../../components/DataFor";

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const Item = (props) => {
    const {data,changeActive,index,setElement=()=>{},active} = props
    const eleRef = useRef()
    const navigate = useNavigate()
    const {cache, setCache} = useContext(Context)

    const actions = [
        {
            key: 'title',
            text: '更改标题',
        },
        {
            key: 'delete',
            text: '删除',
        },
    ]

    const onAction = useMemoizedFn((action,cb)=>{
        if(action.key === 'delete'){
            Modal.confirm({
                content: '删除确认',
                closeOnMaskClick:true,
                onConfirm: () => {
                    const copyCache = cloneDeep(cache)
                    delete copyCache[data.convId]
                    setCache(copyCache)
                    Toast.show({
                        icon: 'success',
                        content: '删除成功',
                        position: 'bottom',
                    })
                    Modal.clear()
                    if(props?.popper?.current) props.popper.current.hide()
                    if(typeof cb === 'function'){
                        cb()
                    }
                },
            })
        }
        if(action.key === 'title'){
            const modal = Modal.show({
                closeOnMaskClick:true,
                title:'',
                content: <Input placeholder={'请输入标题'} defaultValue={data.title} onChange={val=>{
                    valueRef.current = val
                }}/>,
                actions:[
                    {
                        key: 'confirm',
                        text: '确定',
                        confirm: true
                    }
                ],
                onAction: (action)=>{
                    if(action.key === 'confirm'){
                        const copyCache = cloneDeep(cache)
                        copyCache[data.convId]['chat-out-msgs'][0].title = valueRef.current
                        setCache(copyCache)
                        Modal.clear()
                        if(props.popper) props.popper.hide()
                        if(typeof cb === 'function'){
                            cb()
                        }
                    }
                }
            })
        }
    })

    const onContextMenu = useMemoizedFn((event)=>{
        event.preventDefault();
        if(isMobile()) return
        const content = (
            <div className={'adm-popover-inner'}>
                <DataFor list={actions} rowKey={item=>item.key}>
                    {
                        (item)=>{
                            return (
                                <a className="adm-popover-menu-item adm-plain-anchor" onClick={()=>{
                                    onAction(item)
                                }}>
                                    <div className="adm-popover-menu-item-text">{item.text}</div>
                                </a>
                            )
                        }
                    }
                </DataFor>
            </div>
        )
        if(typeof props.onContextMenu === 'function'){
            props.onContextMenu({ x: event.clientX, y: event.clientY },content)
        }
    })

    const valueRef = useRef('')
    useLongPress(() => {
        console.log('LongPress');
        if ('vibrate' in navigator) {
            // 触发短暂的震动，时长为100毫秒
            navigator.vibrate(100);
        }
        Modal.show({
            content: '请选择要执行的操作',
            actions,
            onAction,
            closeOnMaskClick:true
        })
    }, eleRef, {
        onClick: () => {
            if(typeof props.onPreClick === 'function') {
                const rt = props.onPreClick()
                if(!rt) return
            }
            changeActive(index)
            navigate('/chart?convId=' + data.convId + '&title=' + data.title)
        },
        moveThreshold:{
            x:30,
            y:30
        },
        delay: 1000
    });
    useEffect(()=>{
        if(active === index && eleRef.current){
            const el = eleRef.current.querySelector('.adm-card-header-title')
            if(el){
                el.style.textDecoration = 'underline'
            }
            eleRef.current.scrollIntoView()
        }
    },[active,index,eleRef.current])


    return (
        <div
            ref={ref=>{
                eleRef.current = ref
                setElement(ref,index)
            }}
            style={{marginBottom:'20px'}}
            onContextMenu={onContextMenu}
        >
            <Card
                title={
                    <div style={{fontWeight: 'normal'}}>
                        <AntOutline style={{marginRight: '4px', color: '#1677ff'}}/>
                        {data.title}
                    </div>
                }
                extra={<RightOutline/>}
                style={{borderRadius: '16px'}}
                className={'listCard'}
            >
            </Card>
        </div>
    )
}
export default Item
