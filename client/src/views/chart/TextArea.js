import {TextArea} from "antd-mobile";
import React, {useEffect, useRef} from "react";

const CustomTextArea = (props) => {
    const {antdProps = {},onKeyDown = ()=>{},onKeyUp=()=>{}} = props
    const ref = useRef()
    useEffect(()=>{
        const {nativeElement} = ref.current
        nativeElement.addEventListener('keydown',onKeyDown)
        nativeElement.addEventListener('keyup',onKeyUp)
        return ()=>{
            nativeElement.removeEventListener('keydown',onKeyDown)
            nativeElement.removeEventListener('keyup',onKeyUp)
        }
    },[onKeyDown,onKeyUp])
    return (
        <TextArea ref={ref} {...antdProps}/>
    )
}
export default CustomTextArea
