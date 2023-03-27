import {useState} from "react";

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
