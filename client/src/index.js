import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import reportWebVitals from './reportWebVitals';
// import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import {Modal} from "antd-mobile";

const root = ReactDOM.createRoot(document.getElementById('root'));

//REACT_APP_Chart_WEB_URL

async function checkInstall(){
    const webUrl = process.env.REACT_APP_Chart_WEB_URL
    if(navigator.getInstalledRelatedApps){
        const relatedApps = await navigator.getInstalledRelatedApps();
        for(let i=0;i<relatedApps.length;i++){
            if(relatedApps[i].url.includes(webUrl)) return true
        }
    }
    return false
}

window.addEventListener('beforeinstallprompt',async e=>{
    const isInstall = await checkInstall()
    if(!isInstall){
        Modal.confirm({
            content:'是否添加到桌面',
            onConfirm:()=>{
                e.prompt()
            }
        })
    }
})

root.render(
    <App />
);

// serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
