import {TextArea} from "antd-mobile";
import React, {useEffect, useRef} from "react";

function isAndroid() {
    let userAgent = navigator.userAgent.toLowerCase();
    return userAgent.indexOf("android") > -1;
}

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
    // useEffect(()=>{
    //     const {nativeElement} = ref.current
    //     if(!antdProps.value){
    //         nativeElement.style.height = 'auto'
    //     }
    // },[antdProps.value])
    return (
        <TextArea ref={ref} onFocus={()=>{
            if(!isAndroid()) return
            setTimeout(()=>{
                const {nativeElement} = ref.current
                nativeElement.scrollIntoView()
            },300)
        }} {...antdProps}/>
    )
}
export default CustomTextArea
