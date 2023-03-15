import Context from "../../context";
import {useContext, useMemo} from "react";
import DataFor from "../../components/DataFor";
import './list.css'
import {useNavigate} from "react-router-dom";
import {AntOutline, RightOutline} from "antd-mobile-icons";
import {Button, Card, ErrorBlock, Modal} from "antd-mobile";
import Whether, {Else, If} from "../../components/Whether";
import Item from './item'
const List = ()=>{
    const {cache} = useContext(Context)
    const navigate = useNavigate()
    const charts = useMemo(()=>{
        return Object.keys(cache).map(key=>{
            return {
                convId: key,
                title: cache[key]['chat-out-msgs'][0].msg,
                data: cache[key]
            }
        })
    },[cache])

    return (
        <div className={'listContainer'}>
            <div className="main">
                <Whether value={charts.length}>
                    <If>
                        <DataFor list={charts} rowKey={item=>item.convId}>
                            {
                                (item)=>{
                                    return (
                                        <Item data={item}/>
                                    )
                                }
                            }
                        </DataFor>
                    </If>
                    <Else>
                        <ErrorBlock status='empty'>
                            <Button color='primary' onClick={()=>{
                                navigate('/new')
                            }}>开始一个新问题</Button>
                        </ErrorBlock>
                    </Else>
                </Whether>
            </div>
            <Whether value={charts.length}>
                <Button color='primary' block onClick={()=>{
                    navigate('/new')
                }}>
                    开始一个新问题
                </Button>
            </Whether>
        </div>
    )
}
export default List
