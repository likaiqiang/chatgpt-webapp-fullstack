import React from 'react'

const If = ({children})=> children
const Else = ({children})=> children
const Whether = ({value,children})=>{
    const elements = React.Children.toArray(children)
    if(elements.length === 1) return value ? elements[0] : null
    if(elements.length === 2) {
        const [ifEle,elseEle] = elements
        return value ? ifEle : elseEle
    }
    return null
}


export default Whether
export {
    If,
    Else
}
