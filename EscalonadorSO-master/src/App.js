import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import './App.css';
import Escalonador from './Escalonador';

function App() {

  const showFile = async (e) => {
    e.preventDefault()
    const reader = new FileReader()
    reader.onload = async (e) => { 
      const text = (e.target.result)
      setFile(text)
    };
    reader.readAsText(e.target.files[0])
  }

  const [file,setFile] = useState()

  const [process, setProcess] = useState([])
  const [listProcess, setListProcess] = useState([])
  const [screen, setScreen] = useState(0)
  const [quantum, setQuantum] = useState(1)

  const createProcess = () => {
    setProcess([...file.split('\n')])
    createListofProcess()
  }

  const createListofProcess = () => {
    let list = []

    process.forEach((data, index) => {
      let newData = data.split(',')
      if(newData.length >1){
        list.push({
          processId: index,
          arrivalTime: newData[0],
          priority: parseInt(newData[1].trim()),
          processorTime: newData[2],
          mbytes: newData[3],
          disco: newData[4],
          tempoDeQuantumGasto: 0,
          tempoNaFilaBloqueado: 0,
          descontadoTempoDisco: false,
          tempoNaFilaFeedback: 0,
        })

      }
    })
    setListProcess(list)
  }

  function showFile2 () {
    createProcess()    
  }

  if(screen === 0){

    return (    
      <div className="App">
        <div className="App-header">
        
          <p>
            Escalonador SO
          </p>
          <div>
        <input type="file" onChange={(e) => showFile(e)} /><br/><br/>
        <Form.Control type="text" placeholder="Valor do Quantum" onChange={(e) => setQuantum(e.target.value)} /><br/>
      <br/>
        <Button onClick={showFile2}>Mostrar dados</Button>
      </div>
  
        {listProcess.map((data, index) => {
          return (<p>Arrival Time:{data.arrivalTime} | Priority: {data.priority} | Processor Time: {data.processorTime} | #Mbytes: {data.mbytes} | # disco: {data.disco}</p>)
        }        
        )}

  
        {listProcess.length > 0 ? <Button onClick={() => {setScreen(1)}}> Ir para o escalonador </Button> : null }
         
        
      </div>
      </div>
        );
  }else{
    return <Escalonador valorDoQuantum={quantum} listOfProcess={listProcess}/>
  }
}

      export default App;
