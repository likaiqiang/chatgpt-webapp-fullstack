import './App.css';
import {Routes, Route, HashRouter, Navigate} from 'react-router-dom';
import Chat from './views/chart/Chat';
import NewChart from "./views/chart/newChart";
import List from './views/list'
import {useLocalStorage} from "./utils";
import {useEffect, useMemo, useState} from "react";
import Context from "./context";
import {HOST_URL} from './config'

const supportsModels = ['gpt-4-1106-preview','gpt-3.5-turbo-1106']

function App() {
    const [cache,setCache] = useLocalStorage('chart-cache',{})
    const [listActive,changeListActive] = useState(-1)
    const [models, setModels] = useState([])
    const [selectModel, setSelectModel] = useState('gpt-4-1106-preview')
    const charts = useMemo(()=>{
        return Object.keys(cache).map(key=>cache[key])
    },[cache])
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
    return (
        <div className="App">
            <Context.Provider value={{
                cache,
                setCache,
                listActive,
                changeListActive,
                models,
                selectModel,
                setSelectModel
            }}>
                <HashRouter>
                    <Routes>
                        <Route path="/" element={
                            <Navigate to={charts.length ? '/list' : '/new'} />
                        } />
                        <Route path='/chart' element={<Chat/>}/>
                        <Route path='/new' element={<NewChart/>}/>
                        <Route path='/list' element={<List/>}/>
                    </Routes>
                </HashRouter>
            </Context.Provider>
        </div>
    );
}

export default App;
