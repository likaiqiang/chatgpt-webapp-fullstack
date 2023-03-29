import {Card, Modal, Toast, Input} from "antd-mobile";
import {AntOutline, RightOutline} from "antd-mobile-icons";
import {useLongPress} from 'ahooks';
import {useContext, useRef, forwardRef, useImperativeHandle, useEffect} from "react";
import {useNavigate,useLocation} from "react-router-dom";
import cloneDeep from 'lodash.clonedeep'
import Context from '../../context'

const Item = (props) => {
    const {data,changeActive,index,setElement=()=>{},active} = props
    const eleRef = useRef()
    const navigator = useNavigate()
    const {cache, setCache} = useContext(Context)

    const valueRef = useRef('')
    useLongPress(() => {
        console.log('LongPress');
        if ('vibrate' in navigator) {
            // 触发短暂的震动，时长为100毫秒
            navigator.vibrate(100);
        }
        Modal.show({
            content: '请选择要执行的操作',
            actions:[
                {
                    key: 'title',
                    text: '更改标题',
                },
                {
                    key: 'delete',
                    text: '删除',
                },
            ],
            onAction:(action,index)=>{
                if(action.key === 'delete'){
                    Modal.confirm({
                        content: '删除确认',
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
                        },
                    })
                }
                if(action.key === 'title'){
                    const modal = Modal.show({
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
                        onAction: (action,index)=>{
                            if(action.key === 'confirm'){
                                const copyCache = cloneDeep(cache)
                                copyCache[data.convId]['chat-out-msgs'][0].title = valueRef.current
                                setCache(copyCache)
                                Modal.clear()
                            }
                        }
                    })
                }
            }
        })
    }, eleRef, {
        onClick: () => {
            changeActive(index)
            navigator('/chart?convId=' + data.convId + '&title=' + data.title)
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
        <div ref={ref=>{
            eleRef.current = ref
            setElement(ref,index)
        }} style={{marginBottom:'20px'}}>
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
export default forwardRef(Item)
