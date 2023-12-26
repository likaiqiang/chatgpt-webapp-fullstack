import {useContext, useEffect, useState} from "react";
import {useThrottleEffect} from "ahooks";
import Context from "./context";
import {HOST_URL} from "./config";
const supportsModels = ['gpt-4-1106-preview','gpt-3.5-turbo-1106']

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
export function useLocalStorage(key, initialValue) {
    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState(() => {
        if (typeof window === "undefined") {
            return initialValue;
        }
        try {
            // Get from local storage by key
            const item = window.localStorage.getItem(key);
            // Parse stored json or if none return initialValue
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            // If error also return initialValue
            console.log(error);
            return initialValue;
        }
    });
    // Return a wrapped version of useState's setter function that ...
    // ... persists the new value to localStorage.
    const setValue = (value) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;
            // Save state
            setStoredValue(valueToStore);
            // Save to local storage
            if (typeof window !== "undefined") {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            // A more advanced implementation would handle the error case
            console.log(error);
        }
    };
    return [storedValue, setValue];
}
export const useModels = ()=>{
    const [visible, setVisible] = useState(false)

    const [models, setModels] = useState([])
    const [selectModel, setSelectModel] = useLocalStorage('selected-model','gpt-4-1106-preview')

    useEffect(() => {
        fetch(`${HOST_URL}/api/get_models`).then(res=>res.json()).then(res=>{
            const currentModels = []
            for(let model of res.data){
                if(supportsModels.includes(model.id)){
                    currentModels.push(model.id)
                }
            }
            setModels(currentModels)
            if(currentModels.includes(selectModel) === false){
                setSelectModel(currentModels[0])
            }
        })
    }, []);

    const actions = models.map(model=>{
        return {
            text: model,
            key: model
        }
    })
    return {
        models,
        actions,
        visible,
        setVisible,
        selectModel,
        setSelectModel
    }
}
