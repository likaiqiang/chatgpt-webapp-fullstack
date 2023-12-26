
import {Modal} from "antd-mobile";
import html2canvas from "html2canvas";
// Hook

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
