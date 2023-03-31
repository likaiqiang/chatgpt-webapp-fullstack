import {useState} from "react";
import {useThrottleEffect} from "ahooks";

export function useInput(initialValue) {
    const [value, setValue] = useState(initialValue);

    function handleChange(event) {
        console.log('event',event);
        setValue(event?.target?.value || event);
    }

    return {
        value,
        onChange: handleChange
    };
}
export const useScrollToBottom = (cb = ()=>{})=>{
    const [sign, setSign] = useState(0);
    useThrottleEffect(
        cb,
        [sign],
        {
            wait: 300,
        },
    );
    return {
        update:()=>{
            setSign(sign + 1)
        }
    }
}
