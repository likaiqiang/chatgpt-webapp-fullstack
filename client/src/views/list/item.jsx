import {Card, Modal, Toast} from "antd-mobile";
import {AntOutline, RightOutline} from "antd-mobile-icons";
import {useLongPress} from 'ahooks';
import {useContext, useRef} from "react";
import {useNavigate} from "react-router-dom";
import cloneDeep from 'lodash.clonedeep'
import Context from '../../context'

const Item = (props) => {
    const {data} = props
    const ref = useRef()
    const navigator = useNavigate()
    const {cache, setCache} = useContext(Context)
    useLongPress(() => {
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
            },
        })
    }, ref, {
        onClick: () => {
            navigator('/chart?convId=' + data.convId)
        },
        moveThreshold:{
            x:30,
            y:30
        },
        delay: 1000
    });
    return (
        <div ref={ref} style={{marginBottom:'20px'}}>
            <Card
                title={
                    <div style={{fontWeight: 'normal'}}>
                        <AntOutline style={{marginRight: '4px', color: '#1677ff'}}/>
                        {data.title}
                    </div>
                }
                extra={<RightOutline/>}
                style={{borderRadius: '16px'}}
            >
            </Card>
        </div>
    )
}
export default Item
