import Context from "../../context";
import {useContext, useEffect, useMemo, useRef, useState} from "react";
import DataFor from "../../components/DataFor";
import './list.css'
import {useNavigate,useLocation} from "react-router-dom";
import {Button, ErrorBlock} from "antd-mobile";
import Whether, {Else, If} from "../../components/Whether";
import Item from './item'
import CustomPopper from "../../components/Popper";
const List = ()=>{
    const {cache,listActive,changeListActive} = useContext(Context)
    const navigate = useNavigate()
    const charts = useMemo(()=>{
        return Object.keys(cache).map(key=>{
            const title = cache[key]['chat-out-msgs'][0].title || cache[key]['chat-out-msgs'][0].msg
            return {
                convId: key,
                title,
                data: cache[key]
            }
        })
    },[cache])

    const elementsRefs = useRef([]);
    const popperRef = useRef()

    return (
        <div className={'listContainer'}>
            <div className="main">
                <Whether value={charts.length}>
                    <If>
                        <DataFor list={charts} rowKey={item=>item.convId}>
                            {
                                (item,i)=>{
                                    return (
                                        <Item
                                            data={item}
                                            setElement={(el)=>{elementsRefs.current[i] = el}}
                                            changeActive={changeListActive} index={i}
                                            active={listActive}
                                            onPreClick={()=>{
                                                return !popperRef.current.status
                                            }}
                                            onContextMenu={(position,content)=>{
                                                popperRef.current.show(position,content)
                                            }}
                                        />
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
            <CustomPopper ref={popperRef}/>
        </div>
    )
}
export default List
