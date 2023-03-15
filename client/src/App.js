import './App.css';
import {Routes, Route, HashRouter, Navigate} from 'react-router-dom';
import Chat from './views/chart/Chat';
import NewChart from "./views/chart/newChart";
import List from './views/list'
import {useLocalStorage} from "./utils";
import {useMemo} from "react";
import Context from "./context";

function App() {
    const [cache,setCache] = useLocalStorage('chart-cache',{})
    const charts = useMemo(()=>{
        return Object.keys(cache).map(key=>cache[key])
    },[cache])
    return (
        <div className="App">
            <Context.Provider value={{
                cache,
                setCache
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
