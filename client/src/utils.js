
import { useState } from 'react'
import {useMemoizedFn} from "ahooks";
import {Modal} from "antd-mobile";
import html2canvas from "html2canvas";
// Hook
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

export const findValFromQuery = (search, key) => {
  if (!search) {
    return
  }
  const target = search.replace(/^\?/, '').split('&').find(item => item.startsWith(`${key}=`))
  if (!target) {
    return
  }
  return target.split('=')[1];
}

const exportPicture = ({screenshotsRef,cache,convId})=>{
  const dom = screenshotsRef.current || screenshotsRef
  html2canvas(dom).then(canvas=>{
    const dataUrl = canvas.toDataURL();

    // 创建一个新的a标签
    const link = document.createElement("a");

    // 设置a标签的href属性为图像数据URL，设置download属性为文件名
    link.href = dataUrl;
    const title = cache[convId]['chat-out-msgs'][0].title || cache[convId]['chat-out-msgs'][0].msg
    link.download = `${title}.png`;

    // 将a标签添加到页面中并模拟点击
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  })
}

const exportJsonData = ({retMsgs,outMsgs,cache,convId})=>{
  const data = [
    ...retMsgs,
    ...outMsgs,
  ]
      .sort((itemA, itemB) => (itemA?.timestamp - itemB.timestamp))
  const blob = new Blob([JSON.stringify(data,null,2)], {type: "application/json"});

  // Create a download link for the JSON file
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const title = cache[convId]['chat-out-msgs'][0].title || cache[convId]['chat-out-msgs'][0].msg

  link.download = `${title}.json`;
  document.body.appendChild(link);

  // Click the link to trigger the download
  link.click();

  // Clean up the created URL and link element
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
}
export const exportData = ({retMsgs,outMsgs,cache,convId,screenshotsRef})=>{
  Modal.show({
    content: '请选择要执行的操作',
    actions:[
      {
        key: 'picture',
        text: '保存图片',
      },
      {
        key: 'json',
        text: '保存json',
      }
    ],
    onAction(action){
      if(action.key === 'json'){
        exportJsonData({retMsgs,outMsgs,cache,convId})
      }
      if(action.key === 'picture'){
        exportPicture({screenshotsRef,cache,convId})
      }
      Modal.clear()
    },
    closeOnMaskClick:true
  })
}
