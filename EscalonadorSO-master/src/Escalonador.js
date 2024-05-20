import { useEffect, useState } from "react";
import { Button, Modal, Table } from "react-bootstrap";
import "./App.css";

let tamanhoDiscoLimite = 16384;
let tamanhoDiscoVariavel = 16384;
let discosGlobal = 4;
let PtempoRealGlobal = [];
let filaFeedback1Global = [];
let filaFeedback2Global = [];
let filaFeedback3Global = [];
let filaBloqueadosGlobal = [];
let filaBloqueadosSuspensoGlobal = [];
let filaProntoSuspensoGlobal = [];

let filaCPUGlobal = [
  { processId: -1, processorTime: 0, tempoDeQuantumGasto: 0, tempoNaFilaFeedback: 0 },
  { processId: -1, processorTime: 0, tempoDeQuantumGasto: 0, tempoNaFilaFeedback: 0 },
  { processId: -1, processorTime: 0, tempoDeQuantumGasto: 0, tempoNaFilaFeedback: 0 },
  {
    processId: -1,
    processorTime: 0,
    tempoDeQuantumGasto: 0,
    tempoNaFilaBloqueado: 0,
    tempoNaFilaFeedback: 0,
  },
];

let historicoProcessos = [];

function ModalHistorico(props) {
  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">Histórico</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h4>Histórico</h4>
        <h1>Processo: {props.processId}</h1>
        {historicoProcessos.filter((x) => x.processId == props.processId)
          .length > 0
          ? historicoProcessos
            .filter((x) => x.processId == props.processId)[0]
            .historico.map((data, index) => {
              return <h2>{data}</h2>;
            })
          : null}
        <br />
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.onHide}>Fechar</Button>
      </Modal.Footer>
    </Modal>
  );
}

function Escalonador({ listOfProcess, valorDoQuantum }) {
  const [count, setCount] = useState(0);
  const [modalShow, setModalShow] = useState(false);
  const [PTempoReal, setPTempoReal] = useState([]);
  const [filaFeedback1, setFilaFeedback1] = useState([]);
  const [filaFeedback2, setFilaFeedback2] = useState([]);
  const [filaFeedback3, setFilaFeedback3] = useState([]);
  const [filaBloqueados, setFilaBloqueados] = useState([]);
  const [selecteId, setSelectedId] = useState(0);
  const [filaBloqueadoSuspenso, setFilaBloqueadoSuspenso] = useState([]);
  const [filaProntoSuspenso, setFilaProntoSuspenso] = useState([]);
  const [cpus, setCpus] = useState([
    { processId: -1, processorTime: 0, tempoDeQuantumGasto: 0, tempoNaFilaFeedback: 0 },
    { processId: -1, processorTime: 0, tempoDeQuantumGasto: 0, tempoNaFilaFeedback: 0 },
    { processId: -1, processorTime: 0, tempoDeQuantumGasto: 0, tempoNaFilaFeedback: 0 },
    {
      processId: -1,
      processorTime: 0,
      tempoDeQuantumGasto: 0,
      tempoNaFilaBloqueado: 0,
      tempoNaFilaFeedback: 0,
    },
  ]);

  const schedule = () => {
    setCount((val) => val + 1);
  };

  useEffect(() => {
    listOfProcess.forEach((process) => {
      if (process.arrivalTime == count && process.priority == 0) {
        if (tamanhoDiscoVariavel - parseInt(process.mbytes) >= 0) {
          tamanhoDiscoVariavel =
            tamanhoDiscoVariavel - parseInt(process.mbytes);
          PtempoRealGlobal.push(process);
          if (
            historicoProcessos.filter((e) => e.processId == process.processId)
              .length == 0
          ) {
            historicoProcessos.push({
              processId: process.processId,
              historico: [],
            });
          }
        } else {
          TentarAlocarProcessoPriodade0(process);
        }
      } else if (process.arrivalTime == count && process.priority == 1) {
        if (tamanhoDiscoVariavel - parseInt(process.mbytes) >= 0) {
          tamanhoDiscoVariavel =
            tamanhoDiscoVariavel - parseInt(process.mbytes);
          filaFeedback1Global.push(process);
          if (
            historicoProcessos.filter((e) => e.processId == process.processId)
              .length == 0
          ) {
            historicoProcessos.push({
              processId: process.processId,
              historico: [],
            });
          }
        } else {
          TentarAlocarProcessoPriodade1(process);
        }
      }
    });

    //Diminui o processor Time de todo mundo dentro das CPUS e verifica se algum terminou
    DiminuirProcessorTimeProcessosNaCPUVerificaSeAlgumTerminou();

    //aumenta tempo de quantum gasto para todos na cpu
    AumentaTempoQuantumGastoParaTodosNaCpu();

    //Verifica se alguem na cpu que veio da fila de feedback1 perdeu espaço por quantum e coloca na fila de feedback2
    VerificaFeedback1();

    //Verifica se alguem na cpu que veio da fila de feedback2 perdeu espaço por quantum e coloca na fila de feedback3
    VerificarFeedback2();

    //Verifica se alguem na cpu que veio da fila de feedback3 perdeu espaço por quantum e coloca na fila de feedback3
    VerificarFeedback3();

    //Verificar fila de prontoReal e inserir na CPU
    VerificarFilaProntoRealInserirNaCpu();

    //Verifica fila de feedback1 e inserir na CPU
    VerificarCPUComparandoFilaFeedback1();

    //Verifica fila de feedback2 e inserir na CPU
    VerificarCPUComparandoFilaFeedback2();

    //Verifica fila de feedback3 e inserir na CPU
    VerificarCPUComparandoFilaFeedback3();

    //Verificar fila Bloqueados e colocar em disco quem precisa de disco
    VerificarBloqueadosEColocarEmDisco();

    //Passa o processo para a fila de prontos de acordo com a prioridade, se tiver espaço suficiente
    PassarProcessoParaFilaDePronto();

    //Passar os processos que estao em bloqueado suspenso e receberam disco para pronto suspenso
    PassarBloqueadoSuspensoParaProntoSuspenso();

    //Se um processo ficar mais de 10 momentos na fila de feedback 3 ou 2 ele passa pra fila de prioridade com prioridade superior
    PassarDeFeedbackParaFeedbackComPrioridadeMaiorSeBaterOTempo();

    //Registra o historico dos processos
    RegistrarHistorico();

    if(tamanhoDiscoVariavel > tamanhoDiscoLimite){
      tamanhoDiscoVariavel = tamanhoDiscoLimite
    }

    setPTempoReal(PtempoRealGlobal);
    setFilaFeedback1(filaFeedback1Global);
    setFilaFeedback2(filaFeedback2Global);
    setFilaFeedback3(filaFeedback3Global);
    setFilaBloqueados(filaBloqueadosGlobal);
    setFilaBloqueadoSuspenso(filaBloqueadosSuspensoGlobal);
    setFilaProntoSuspenso(filaProntoSuspensoGlobal);
    setCpus(filaCPUGlobal);
  }, [count]);

  function PassarDeFeedbackParaFeedbackComPrioridadeMaiorSeBaterOTempo(){
    let paraRetirarDeFeedback3 = []
    let paraRetirarDeFeedback2 = []
    let paraAdicionarEmFeedback2 = []
    let paraAdicionarEmFeedback1 = []

    for(let i = 0; i < filaFeedback3Global.length; i++){
      filaFeedback3Global[i].tempoNaFilaFeedback = parseInt(filaFeedback3Global[i].tempoNaFilaFeedback) + 1
      if(filaFeedback3Global[i].tempoNaFilaFeedback >= 10){
        paraRetirarDeFeedback3.push(filaFeedback3Global[i])
        if(filaFeedback3Global[i] != undefined){
          filaFeedback3Global[i].tempoNaFilaFeedback = 0;
        }
        filaFeedback3Global[i].priority = 2
        paraAdicionarEmFeedback2.push(filaFeedback3Global[i])
      }
    }

    for(let i = 0; i < filaFeedback2Global.length; i++){
      filaFeedback2Global[i].tempoNaFilaFeedback = parseInt(filaFeedback2Global[i].tempoNaFilaFeedback) + 1
      if(filaFeedback2Global[i].tempoNaFilaFeedback >= 10){
        paraRetirarDeFeedback2.push(filaFeedback2Global[i])
        if(filaFeedback2Global[i] != undefined){
          filaFeedback2Global[i].tempoNaFilaFeedback = 0;
        }
        filaFeedback2Global[i].priority = 1
        paraAdicionarEmFeedback1.push(filaFeedback2Global[i])
      }
    }

    for (let i = 0; i < paraRetirarDeFeedback3.length; i++) {
      filaFeedback3Global = filaFeedback3Global.filter(x => x != paraRetirarDeFeedback3[i]);
    }

    for (let i = 0; i < paraRetirarDeFeedback2.length; i++) {
      filaFeedback2Global = filaFeedback2Global.filter(x => x != paraRetirarDeFeedback2[i]);
    }

    for (let i = 0; i < paraAdicionarEmFeedback2.length; i++) {
      filaFeedback2Global.push(paraAdicionarEmFeedback2[i]);
    }

    for (let i = 0; i < paraAdicionarEmFeedback1.length; i++) {
      filaFeedback1Global.push(paraAdicionarEmFeedback1[i]);
    }

  }

  function PassarProcessoParaFilaDePronto() {
    let paraRetirarProntoSuspenso = []
    for (let i = 0; i < filaProntoSuspensoGlobal.length; i++) {
      if (
        parseInt(filaProntoSuspensoGlobal[i].mbytes) <=
        tamanhoDiscoVariavel
      ) {

        if (filaProntoSuspensoGlobal[i].priority === 1) {
          filaFeedback1Global.push(filaProntoSuspensoGlobal[i]);
          paraRetirarProntoSuspenso.push(filaProntoSuspensoGlobal[i])
          tamanhoDiscoVariavel = tamanhoDiscoVariavel + parseInt(filaProntoSuspensoGlobal[i].mbytes);
        } else if (filaProntoSuspensoGlobal[i].priority === 2) {
          filaFeedback2Global.push(filaProntoSuspensoGlobal[i]);
          paraRetirarProntoSuspenso.push(filaProntoSuspensoGlobal[i])
          tamanhoDiscoVariavel = tamanhoDiscoVariavel + parseInt(filaProntoSuspensoGlobal[i].mbytes);
        } else {
          filaFeedback3Global.push(filaProntoSuspensoGlobal[i]);
          paraRetirarProntoSuspenso.push(filaProntoSuspensoGlobal[i])
          tamanhoDiscoVariavel = tamanhoDiscoVariavel + parseInt(filaProntoSuspensoGlobal[i].mbytes);
        }
      }
    }
    for (let i = 0; i < paraRetirarProntoSuspenso.length; i++) {
      filaProntoSuspensoGlobal = filaProntoSuspensoGlobal.filter(x => x != paraRetirarProntoSuspenso[i]);
    }
  }

  function PassarBloqueadoSuspensoParaProntoSuspenso() {
    if (filaBloqueadosGlobal.length == 0) {
      let toRemoveFromBloqueadosSuspenso = [];
      for (var i = 0; i < filaBloqueadosSuspensoGlobal.length; i++) {
        if (filaBloqueadosSuspensoGlobal[i].descontadoTempoDisco) {
          filaBloqueadosSuspensoGlobal[i].tempoNaFilaBloqueado++;

          if (filaBloqueadosSuspensoGlobal[i].tempoNaFilaBloqueado == 2) {
            discosGlobal =
              parseInt(discosGlobal) + parseInt(filaBloqueadosSuspensoGlobal[i].disco);
            filaBloqueadosSuspensoGlobal[i].disco = 0;
            toRemoveFromBloqueadosSuspenso.push(filaBloqueadosSuspensoGlobal[i]);
            filaProntoSuspensoGlobal.push(filaBloqueadosSuspensoGlobal[i])

          }
        }
        if (
          parseInt(discosGlobal) - parseInt(filaBloqueadosSuspensoGlobal[i].disco) >= 0 &&
          !filaBloqueadosSuspensoGlobal[i].descontadoTempoDisco
        ) {
          discosGlobal =
            parseInt(discosGlobal) - parseInt(filaBloqueadosSuspensoGlobal[i].disco);
          filaBloqueadosSuspensoGlobal[i].descontadoTempoDisco = true;
        }
      }

      //remove os processos da fila de feedback1 q foram inseridos na cpu
      filaBloqueadosSuspensoGlobal = filaBloqueadosSuspensoGlobal.filter(
        (item) => !toRemoveFromBloqueadosSuspenso.includes(item)
      );
    }
  }

  function TentarAlocarProcessoPriodade0(process) {
    let conseguiAlocar = false;
    let somaProcessos = 0;
    let bloqueadosParaBloqueadosSuspenso = [];
    let paraRetirarDaFilaDeBloqueados = [];
    for (let i = filaBloqueadosGlobal.length - 1; i >= 0; i--) {
      somaProcessos += parseInt(filaBloqueadosGlobal[i].mbytes);
      if (somaProcessos >= parseInt(process.mbytes) && !conseguiAlocar) {
        conseguiAlocar = true;
        for (let j = i; j < filaBloqueadosGlobal.length; j++) {
          tamanhoDiscoVariavel += parseInt(filaBloqueadosGlobal[j].mbytes);
          bloqueadosParaBloqueadosSuspenso.push(filaBloqueadosGlobal[j]);
          paraRetirarDaFilaDeBloqueados.push(filaBloqueadosGlobal[j]);
        }
      }
    }
    if (conseguiAlocar) {
      tamanhoDiscoVariavel -= parseInt(process.mbytes);
      PtempoRealGlobal.push(process);
      for (let i = 0; i < bloqueadosParaBloqueadosSuspenso.length; i++) {
        if(bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco){
          bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco = false
          discosGlobal = discosGlobal + parseInt(bloqueadosParaBloqueadosSuspenso[i].disco)
        }
        filaBloqueadosSuspensoGlobal.push(bloqueadosParaBloqueadosSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeBloqueados.length; i++) {
        filaBloqueadosGlobal = filaBloqueadosGlobal.filter(
          (x) => x != paraRetirarDaFilaDeBloqueados[i]
        );
      }
      return;
    } else {
      bloqueadosParaBloqueadosSuspenso = filaBloqueadosGlobal;
      paraRetirarDaFilaDeBloqueados = filaBloqueadosGlobal;
      tentarAlocarProcessoPrioridade0EmFeedback3(
        process,
        somaProcessos,
        bloqueadosParaBloqueadosSuspenso,
        paraRetirarDaFilaDeBloqueados
      );
    }
  }

  function tentarAlocarProcessoPrioridade0EmFeedback3(
    process,
    somaProcessos,
    bloqueadosParaBloqueadosSuspenso,
    paraRetirarDaFilaDeBloqueados
  ) {
    let conseguiAlocar = false;
    let feedback3ParaProntoSuspenso = [];
    let paraRetirarDaFilaDeFeedback3 = [];

    for (let i = filaFeedback3Global.length - 1; i >= 0; i--) {
      somaProcessos += parseInt(filaFeedback3Global[i].mbytes);
      if (somaProcessos >= parseInt(process.mbytes) && !conseguiAlocar) {
        conseguiAlocar = true;
        for (let j = i; j < filaFeedback3Global.length; j++) {
          tamanhoDiscoVariavel += parseInt(filaFeedback3Global[j].mbytes);
          feedback3ParaProntoSuspenso.push(filaFeedback3Global[j]);
          paraRetirarDaFilaDeFeedback3.push(filaFeedback3Global[j]);
        }
      }
    }

    if (conseguiAlocar) {
      tamanhoDiscoVariavel -= parseInt(process.mbytes);
      PtempoRealGlobal.push(process);
      for (let i = 0; i < feedback3ParaProntoSuspenso.length; i++) {
        filaProntoSuspensoGlobal.push(feedback3ParaProntoSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeFeedback3.length; i++) {
        filaFeedback3Global = filaFeedback3Global.filter(
          (x) => x != paraRetirarDaFilaDeFeedback3[i]
        );
      }
      for (let i = 0; i < bloqueadosParaBloqueadosSuspenso.length; i++) {
        if(bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco){
          bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco = false
          discosGlobal = discosGlobal + parseInt(bloqueadosParaBloqueadosSuspenso[i].disco)
        }
        filaBloqueadosSuspensoGlobal.push(bloqueadosParaBloqueadosSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeBloqueados.length; i++) {
        filaBloqueadosGlobal = filaBloqueadosGlobal.filter(
          (x) => x != paraRetirarDaFilaDeBloqueados[i]
        );
      }
    } else {
      feedback3ParaProntoSuspenso = filaFeedback3Global
      paraRetirarDaFilaDeFeedback3 = filaFeedback3Global
      tentarAlocarProcessoPrioridade0EmFeedback2(
        process,
        somaProcessos,
        bloqueadosParaBloqueadosSuspenso,
        paraRetirarDaFilaDeBloqueados,
        feedback3ParaProntoSuspenso,
        paraRetirarDaFilaDeFeedback3
      );
    }
  }

  function tentarAlocarProcessoPrioridade0EmFeedback2(
    process,
    somaProcessos,
    bloqueadosParaBloqueadosSuspenso,
    paraRetirarDaFilaDeBloqueados,
    feedback3ParaProntoSuspenso,
    paraRetirarDaFilaDeFeedback3
  ) {
    let conseguiAlocar = false;
    let feedback2ParaProntoSuspenso = [];
    let paraRetirarDaFilaDeFeedback2 = [];

    for (let i = filaFeedback2Global.length - 1; i >= 0; i--) {
      somaProcessos += parseInt(filaFeedback2Global[i].mbytes);
      if (somaProcessos >= parseInt(process.mbytes) && !conseguiAlocar) {
        conseguiAlocar = true;
        for (let j = i; j < filaFeedback2Global.length; j++) {
          tamanhoDiscoVariavel += parseInt(filaFeedback2Global[j].mbytes);
          feedback2ParaProntoSuspenso.push(filaFeedback2Global[j]);
          paraRetirarDaFilaDeFeedback2.push(filaFeedback2Global[j]);
        }
      }
    }

    if (conseguiAlocar) {
      tamanhoDiscoVariavel -= parseInt(process.mbytes);
      PtempoRealGlobal.push(process);
      for (let i = 0; i < feedback2ParaProntoSuspenso.length; i++) {
        filaProntoSuspensoGlobal.push(feedback2ParaProntoSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeFeedback2.length; i++) {
        filaFeedback2Global = filaFeedback2Global.filter(
          (x) => x != paraRetirarDaFilaDeFeedback2[i]
        );
      }
      for (let i = 0; i < feedback3ParaProntoSuspenso.length; i++) {
        filaProntoSuspensoGlobal.push(feedback3ParaProntoSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeFeedback3.length; i++) {
        filaFeedback3Global = filaFeedback3Global.filter(
          (x) => x != paraRetirarDaFilaDeFeedback3[i]
        );
      }
      for (let i = 0; i < bloqueadosParaBloqueadosSuspenso.length; i++) {
        if(bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco){
          bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco = false
          discosGlobal = discosGlobal + parseInt(bloqueadosParaBloqueadosSuspenso[i].disco)
        }
        filaBloqueadosSuspensoGlobal.push(bloqueadosParaBloqueadosSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeBloqueados.length; i++) {
        filaBloqueadosGlobal = filaBloqueadosGlobal.filter(
          (x) => x != paraRetirarDaFilaDeBloqueados[i]
        );
      }
    } else {
      feedback2ParaProntoSuspenso = filaFeedback2Global
      paraRetirarDaFilaDeFeedback2 = filaFeedback2Global
      tentarAlocarProcessoPrioridade0EmFeedback1(
        process,
        somaProcessos,
        bloqueadosParaBloqueadosSuspenso,
        paraRetirarDaFilaDeBloqueados,
        feedback3ParaProntoSuspenso,
        paraRetirarDaFilaDeFeedback3,
        feedback2ParaProntoSuspenso,
        paraRetirarDaFilaDeFeedback2
      );
    }
  }
  function tentarAlocarProcessoPrioridade0EmFeedback1(
    process,
    somaProcessos,
    bloqueadosParaBloqueadosSuspenso,
    paraRetirarDaFilaDeBloqueados,
    feedback3ParaProntoSuspenso,
    paraRetirarDaFilaDeFeedback3,
    feedback2ParaProntoSuspenso,
    paraRetirarDaFilaDeFeedback2
  ) {
    let conseguiAlocar = false;
    let feedback1ParaBloqueadosSuspenso = [];
    let paraRetirarDaFilaDeFeedback1 = [];

    for (let i = filaFeedback1Global.length - 1; i >= 0; i--) {
      somaProcessos += parseInt(filaFeedback1Global[i].mbytes);
      if (somaProcessos >= parseInt(process.mbytes) && !conseguiAlocar) {
        conseguiAlocar = true;
        for (let j = i; j < filaFeedback1Global.length; j++) {
          tamanhoDiscoVariavel += parseInt(filaFeedback1Global[j].mbytes);
          feedback1ParaBloqueadosSuspenso.push(filaFeedback1Global[j]);
          paraRetirarDaFilaDeFeedback1.push(filaFeedback1Global[j]);
        }
      }
    }

    if (conseguiAlocar) {
      tamanhoDiscoVariavel -= parseInt(process.mbytes);
      PtempoRealGlobal.push(process);
      for (let i = 0; i < feedback1ParaBloqueadosSuspenso.length; i++) {
        filaProntoSuspensoGlobal.push(feedback1ParaBloqueadosSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeFeedback1.length; i++) {
        filaFeedback1Global = filaFeedback1Global.filter(
          (x) => x != paraRetirarDaFilaDeFeedback1[i]
        );
      }
      for (let i = 0; i < feedback2ParaProntoSuspenso.length; i++) {
        filaProntoSuspensoGlobal.push(feedback2ParaProntoSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeFeedback2.length; i++) {
        filaFeedback2Global = filaFeedback2Global.filter(
          (x) => x != paraRetirarDaFilaDeFeedback2[i]
        );
      }
      for (let i = 0; i < feedback3ParaProntoSuspenso.length; i++) {
        filaProntoSuspensoGlobal.push(feedback3ParaProntoSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeFeedback3.length; i++) {
        filaFeedback3Global = filaFeedback3Global.filter(
          (x) => x != paraRetirarDaFilaDeFeedback3[i]
        );
      }
      for (let i = 0; i < bloqueadosParaBloqueadosSuspenso.length; i++) {
        if(bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco){
          bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco = false
          discosGlobal = discosGlobal + parseInt(bloqueadosParaBloqueadosSuspenso[i].disco)
        }
        filaBloqueadosSuspensoGlobal.push(bloqueadosParaBloqueadosSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeBloqueados.length; i++) {
        filaBloqueadosGlobal = filaBloqueadosGlobal.filter(
          (x) => x != paraRetirarDaFilaDeBloqueados[i]
        );
      }
    } else {
      filaProntoSuspensoGlobal.push(process);
    }
  }

  function TentarAlocarProcessoPriodade1(process) {
    let conseguiAlocar = false;
    let somaProcessos = 0;
    let bloqueadosParaBloqueadosSuspenso = [];
    let paraRetirarDaFilaDeBloqueados = [];
    for (let i = filaBloqueadosGlobal.length - 1; i >= 0; i--) {
      somaProcessos += parseInt(filaBloqueadosGlobal[i].mbytes);
      console.log(somaProcessos)
      if (somaProcessos >= parseInt(process.mbytes) && !conseguiAlocar) {
        conseguiAlocar = true;
        for (let j = i; j < filaBloqueadosGlobal.length; j++) {
          tamanhoDiscoVariavel += parseInt(filaBloqueadosGlobal[j].mbytes);
          bloqueadosParaBloqueadosSuspenso.push(filaBloqueadosGlobal[j]);
          paraRetirarDaFilaDeBloqueados.push(filaBloqueadosGlobal[j]);
        }
      }
    }
    if (conseguiAlocar) {
      tamanhoDiscoVariavel -= parseInt(process.mbytes);
      PtempoRealGlobal.push(process);
      for (let i = 0; i < bloqueadosParaBloqueadosSuspenso.length; i++) {
        if(bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco){
          bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco = false
          discosGlobal = discosGlobal + parseInt(bloqueadosParaBloqueadosSuspenso[i].disco)
        }
        filaBloqueadosSuspensoGlobal.push(bloqueadosParaBloqueadosSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeBloqueados.length; i++) {
        filaBloqueadosGlobal = filaBloqueadosGlobal.filter(
          (x) => x != paraRetirarDaFilaDeBloqueados[i]
        );
      }
      return;
    } else {
      bloqueadosParaBloqueadosSuspenso = filaBloqueadosGlobal;
      paraRetirarDaFilaDeBloqueados = filaBloqueadosGlobal;
      tentarAlocarProcessoPrioridade1EmFeedback3(
        process,
        somaProcessos,
        bloqueadosParaBloqueadosSuspenso,
        paraRetirarDaFilaDeBloqueados
      );
    }
   }

   function tentarAlocarProcessoPrioridade1EmFeedback3(
    process,
    somaProcessos,
    bloqueadosParaBloqueadosSuspenso,
    paraRetirarDaFilaDeBloqueados
  ) {
    let conseguiAlocar = false;
    let feedback3ParaProntoSuspenso = [];
    let paraRetirarDaFilaDeFeedback3 = [];

    for (let i = filaFeedback3Global.length - 1; i >= 0; i--) {
      somaProcessos += parseInt(filaFeedback3Global[i].mbytes);
      if (somaProcessos >= parseInt(process.mbytes) && !conseguiAlocar) {
        conseguiAlocar = true;
        for (let j = i; j < filaFeedback3Global.length; j++) {
          tamanhoDiscoVariavel += parseInt(filaFeedback3Global[j].mbytes);
          feedback3ParaProntoSuspenso.push(filaFeedback3Global[j]);
          paraRetirarDaFilaDeFeedback3.push(filaFeedback3Global[j]);
        }
      }
    }

    if (conseguiAlocar) {
      tamanhoDiscoVariavel -= parseInt(process.mbytes);
      PtempoRealGlobal.push(process);
      for (let i = 0; i < feedback3ParaProntoSuspenso.length; i++) {
        filaProntoSuspensoGlobal.push(feedback3ParaProntoSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeFeedback3.length; i++) {
        filaFeedback3Global = filaFeedback3Global.filter(
          (x) => x != paraRetirarDaFilaDeFeedback3[i]
        );
      }
      for (let i = 0; i < bloqueadosParaBloqueadosSuspenso.length; i++) {
        if(bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco){
          bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco = false
          discosGlobal = discosGlobal + parseInt(bloqueadosParaBloqueadosSuspenso[i].disco)
        }
        filaBloqueadosSuspensoGlobal.push(bloqueadosParaBloqueadosSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeBloqueados.length; i++) {
        filaBloqueadosGlobal = filaBloqueadosGlobal.filter(
          (x) => x != paraRetirarDaFilaDeBloqueados[i]
        );
      }
    } else {
      feedback3ParaProntoSuspenso = filaFeedback3Global
      paraRetirarDaFilaDeFeedback3 = filaFeedback3Global
      tentarAlocarProcessoPrioridade1EmFeedback2(
        process,
        somaProcessos,
        bloqueadosParaBloqueadosSuspenso,
        paraRetirarDaFilaDeBloqueados,
        feedback3ParaProntoSuspenso,
        paraRetirarDaFilaDeFeedback3
      );
    }
  }

  function tentarAlocarProcessoPrioridade1EmFeedback2(
    process,
    somaProcessos,
    bloqueadosParaBloqueadosSuspenso,
    paraRetirarDaFilaDeBloqueados,
    feedback3ParaProntoSuspenso,
    paraRetirarDaFilaDeFeedback3
  ) {
    let conseguiAlocar = false;
    let feedback2ParaProntoSuspenso = [];
    let paraRetirarDaFilaDeFeedback2 = [];

    for (let i = filaFeedback2Global.length - 1; i >= 0; i--) {
      somaProcessos += parseInt(filaFeedback2Global[i].mbytes);
      if (somaProcessos >= parseInt(process.mbytes) && !conseguiAlocar) {
        conseguiAlocar = true;
        for (let j = i; j < filaFeedback2Global.length; j++) {
          tamanhoDiscoVariavel += parseInt(filaFeedback2Global[j].mbytes);
          feedback2ParaProntoSuspenso.push(filaFeedback2Global[j]);
          paraRetirarDaFilaDeFeedback2.push(filaFeedback2Global[j]);
        }
      }
    }

    if (conseguiAlocar) {
      tamanhoDiscoVariavel -= parseInt(process.mbytes);
      PtempoRealGlobal.push(process);
      for (let i = 0; i < feedback2ParaProntoSuspenso.length; i++) {
        filaProntoSuspensoGlobal.push(feedback2ParaProntoSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeFeedback2.length; i++) {
        filaFeedback2Global = filaFeedback2Global.filter(
          (x) => x != paraRetirarDaFilaDeFeedback2[i]
        );
      }
      for (let i = 0; i < feedback3ParaProntoSuspenso.length; i++) {
        filaProntoSuspensoGlobal.push(feedback3ParaProntoSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeFeedback3.length; i++) {
        filaFeedback3Global = filaFeedback3Global.filter(
          (x) => x != paraRetirarDaFilaDeFeedback3[i]
        );
      }
      for (let i = 0; i < bloqueadosParaBloqueadosSuspenso.length; i++) {
        if(bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco){
          bloqueadosParaBloqueadosSuspenso[i].descontadoTempoDisco = false
          discosGlobal = discosGlobal + parseInt(bloqueadosParaBloqueadosSuspenso[i].disco)
        }
        filaBloqueadosSuspensoGlobal.push(bloqueadosParaBloqueadosSuspenso[i]);
      }
      for (let i = 0; i < paraRetirarDaFilaDeBloqueados.length; i++) {
        filaBloqueadosGlobal = filaBloqueadosGlobal.filter(
          (x) => x != paraRetirarDaFilaDeBloqueados[i]
        );
      }
    }  else {
      console.log(process)
      filaProntoSuspensoGlobal.push(process);
    }
  }

  function RegistrarHistorico() {
    for (let i = 0; i < PtempoRealGlobal.length; i++) {
      for (let j = 0; j < historicoProcessos.length; j++) {
        if (historicoProcessos[j].processId == PtempoRealGlobal[i].processId) {
          historicoProcessos[j].historico.push("Fila de tempo real");
        }
      }
    }
    for (let i = 0; i < filaFeedback1Global.length; i++) {
      for (let j = 0; j < historicoProcessos.length; j++) {
        if (
          historicoProcessos[j].processId == filaFeedback1Global[i].processId
        ) {
          historicoProcessos[j].historico.push("Feedback 1");
        }
      }
    }
    for (let i = 0; i < filaFeedback2Global.length; i++) {
      for (let j = 0; j < historicoProcessos.length; j++) {
        if (
          historicoProcessos[j].processId == filaFeedback2Global[i].processId
        ) {
          historicoProcessos[j].historico.push("Feedback 2");
        }
      }
    }
    for (let i = 0; i < filaFeedback3Global.length; i++) {
      for (let j = 0; j < historicoProcessos.length; j++) {
        if (
          historicoProcessos[j].processId == filaFeedback3Global[i].processId
        ) {
          historicoProcessos[j].historico.push("Feedback 3");
        }
      }
    }
    for (let i = 0; i < filaBloqueadosGlobal.length; i++) {
      for (let j = 0; j < historicoProcessos.length; j++) {
        if (
          historicoProcessos[j].processId == filaBloqueadosGlobal[i].processId
        ) {
          historicoProcessos[j].historico.push("Bloqueados");
        }
      }
    }
    for (let i = 0; i < filaCPUGlobal.length; i++) {
      for (let j = 0; j < historicoProcessos.length; j++) {
        if (historicoProcessos[j].processId == filaCPUGlobal[i].processId) {
          historicoProcessos[j].historico.push("CPU");
        }
      }
    }

    for (let i = 0; i < filaBloqueadosSuspensoGlobal.length; i++) {
      for (let j = 0; j < historicoProcessos.length; j++) {
        if (historicoProcessos[j].processId == filaBloqueadosSuspensoGlobal[i].processId) {
          historicoProcessos[j].historico.push("Bloqueado Suspenso");
        }
      }
    }

    for (let i = 0; i < filaProntoSuspensoGlobal.length; i++) {
      for (let j = 0; j < historicoProcessos.length; j++) {
        if (historicoProcessos[j].processId == filaProntoSuspensoGlobal[i].processId) {
          historicoProcessos[j].historico.push("Pronto Suspenso");
        }
      }
    }
  }

  function VerificarBloqueadosEColocarEmDisco() {
    let toRemoveFromBloqueados = [];
    for (var i = 0; i < filaBloqueadosGlobal.length; i++) {
      if (filaBloqueadosGlobal[i].descontadoTempoDisco) {
        filaBloqueadosGlobal[i].tempoNaFilaBloqueado++;

        if (filaBloqueadosGlobal[i].tempoNaFilaBloqueado == 2) {
          if (filaBloqueadosGlobal[i].priority == 1) {
            discosGlobal =
              parseInt(discosGlobal) + parseInt(filaBloqueadosGlobal[i].disco);
            filaBloqueadosGlobal[i].disco = 0;
            toRemoveFromBloqueados.push(filaBloqueadosGlobal[i]);
            filaFeedback1Global.push(filaBloqueadosGlobal[i]);
          } else if (filaBloqueadosGlobal[i].priority == 2) {
            discosGlobal =
              parseInt(discosGlobal) + parseInt(filaBloqueadosGlobal[i].disco);
            filaBloqueadosGlobal[i].disco = 0;
            toRemoveFromBloqueados.push(filaBloqueadosGlobal[i]);
            filaFeedback2Global.push(filaBloqueadosGlobal[i]);
          } else {
            discosGlobal =
              parseInt(discosGlobal) + parseInt(filaBloqueadosGlobal[i].disco);
            filaBloqueadosGlobal[i].disco = 0;
            toRemoveFromBloqueados.push(filaBloqueadosGlobal[i]);
            filaFeedback3Global.push(filaBloqueadosGlobal[i]);
          }
        }
      }
      if (
        parseInt(discosGlobal) - parseInt(filaBloqueadosGlobal[i].disco) >= 0 &&
        !filaBloqueadosGlobal[i].descontadoTempoDisco
      ) {
        discosGlobal =
          parseInt(discosGlobal) - parseInt(filaBloqueadosGlobal[i].disco);
        filaBloqueadosGlobal[i].descontadoTempoDisco = true;
      }
    }

    //remove os processos da fila de feedback1 q foram inseridos na cpu
    filaBloqueadosGlobal = filaBloqueadosGlobal.filter(
      (item) => !toRemoveFromBloqueados.includes(item)
    );
  }

  function VerificarCPUComparandoFilaFeedback1() {
    let processosNaCPUOrdenadosPorPrioridade = filaCPUGlobal.sort(
      (a, b) => b.priority - a.priority
    );
    let toRemoveFromFeedback1 = [];
    let index2 = 0;
    for (var i = 0; i < 4; i++) {
      processosNaCPUOrdenadosPorPrioridade = filaCPUGlobal.sort(
        (a, b) => b.priority - a.priority
      );
      if (filaCPUGlobal[i].processId == -1 && filaFeedback1Global.length > 0) {
        filaCPUGlobal[i] = filaFeedback1Global[index2];
        toRemoveFromFeedback1.push(filaFeedback1Global[index2]);
        index2++;
      } else if (
        PtempoRealGlobal.length > 0 &&
        processosNaCPUOrdenadosPorPrioridade.filter(
          (x) => x.processId == -1 || undefined
        ).length == 0
      ) {
        if (
          filaCPUGlobal[i].processId ==
          processosNaCPUOrdenadosPorPrioridade[0].processId &&
          filaFeedback1Global[i] !== undefined &&
          filaFeedback1Global[i].priority <
          processosNaCPUOrdenadosPorPrioridade[0].priority
        ) {
          if (processosNaCPUOrdenadosPorPrioridade[0].priority == 1) {
            filaFeedback1Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          } else if (processosNaCPUOrdenadosPorPrioridade[0].priority == 2) {
            filaFeedback2Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          } else if (processosNaCPUOrdenadosPorPrioridade[0].priority == 3) {
            filaFeedback3Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          }
          filaCPUGlobal[i] = filaFeedback1Global[index2];
          toRemoveFromFeedback1.push(filaFeedback1Global[index2]);
          index2++;
        }
      }
      if (filaCPUGlobal[i] == undefined) {
        filaCPUGlobal[i] = {
          processId: -1,
          processorTime: 0,
          tempoDeQuantumGasto: 0,
          tempoNaFilaFeedback: 0,
        };
      }
    }
    //remove os processos da fila de feedback1 q foram inseridos na cpu
    filaFeedback1Global = filaFeedback1Global.filter(
      (item) => !toRemoveFromFeedback1.includes(item)
    );
  }

  function VerificarCPUComparandoFilaFeedback2() {
    let processosNaCPUOrdenadosPorPrioridade = filaCPUGlobal.sort(
      (a, b) => b.priority - a.priority
    );
    let toRemoveFromFeedback2 = [];
    let index3 = 0;
    for (var i = 0; i < 4; i++) {
      if (filaCPUGlobal[i].processId == -1 && filaFeedback2Global.length > 0) {
        toRemoveFromFeedback2.push(filaFeedback2Global[index3]);
        if(filaFeedback2Global[index3] != undefined){
          filaFeedback2Global[index3].tempoNaFilaFeedback = 0;
        }
        filaCPUGlobal[i] = filaFeedback2Global[index3];
        index3++;
      } else if (
        PtempoRealGlobal.length > 0 &&
        processosNaCPUOrdenadosPorPrioridade.filter(
          (x) => x.processId == -1 || undefined
        ).length == 0
      ) {
        if (
          filaCPUGlobal[i].processId ==
          processosNaCPUOrdenadosPorPrioridade[0].processId &&
          filaFeedback2Global[i] !== undefined &&
          filaFeedback2Global[i].priority <
          processosNaCPUOrdenadosPorPrioridade[0].priority
        ) {
          if (processosNaCPUOrdenadosPorPrioridade[0].priority == 1) {
            filaFeedback1Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          } else if (processosNaCPUOrdenadosPorPrioridade[0].priority == 2) {
            filaFeedback2Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          } else if (processosNaCPUOrdenadosPorPrioridade[0].priority == 3) {
            filaFeedback3Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          }
          toRemoveFromFeedback2.push(filaFeedback2Global[index3]);
          if(filaFeedback2Global[index3] != undefined){
            filaFeedback2Global[index3].tempoNaFilaFeedback = 0
          }
          filaCPUGlobal[i] = filaFeedback2Global[index3];
          index3++;
        }
      }
      if (filaCPUGlobal[i] == undefined) {
        filaCPUGlobal[i] = {
          processId: -1,
          processorTime: 0,
          tempoDeQuantumGasto: 0,
          tempoNaFilaFeedback: 0,
        };
      }
    }

    //remove os processos da fila de feedback2 q foram inseridos na cpu
    filaFeedback2Global = filaFeedback2Global.filter(
      (item) => !toRemoveFromFeedback2.includes(item)
    );
  }

  function VerificarCPUComparandoFilaFeedback3() {
    let processosNaCPUOrdenadosPorPrioridade = filaCPUGlobal.sort(
      (a, b) => b.priority - a.priority
    );
    let toRemoveFromFeedback3 = [];
    let index4 = 0;
    for (var i = 0; i < 4; i++) {
      if (filaCPUGlobal[i].processId == -1 && filaFeedback3Global.length > 0) {     
        toRemoveFromFeedback3.push(filaFeedback3Global[index4]);
        if(filaFeedback3Global[index4] != undefined){
          filaFeedback3Global[index4].tempoNaFilaFeedback = 0;
        }
        filaCPUGlobal[i] = filaFeedback3Global[index4];
        index4++;
      } else if (
        PtempoRealGlobal.length > 0 &&
        processosNaCPUOrdenadosPorPrioridade.filter(
          (x) => x.processId == -1 || undefined
        ).length == 0
      ) {
        if (
          filaCPUGlobal[i].processId ==
          processosNaCPUOrdenadosPorPrioridade[0].processId &&
          filaFeedback3Global[i] !== undefined &&
          filaFeedback3Global[i].priority <
          processosNaCPUOrdenadosPorPrioridade[0].priority
        ) {
          if (processosNaCPUOrdenadosPorPrioridade[0].priority == 1) {
            filaFeedback1Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          } else if (processosNaCPUOrdenadosPorPrioridade[0].priority == 2) {
            filaFeedback2Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          } else if (processosNaCPUOrdenadosPorPrioridade[0].priority == 3) {
            filaFeedback3Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          }
          toRemoveFromFeedback3.push(filaFeedback3Global[index4]);
          if(filaFeedback3Global[index4] != undefined){
            filaFeedback3Global[index4].tempoNaFilaFeedback = 0;
          }
          filaCPUGlobal[i] = filaFeedback3Global[index4];
          index4++;
        }
      }
      if (filaCPUGlobal[i] == undefined) {
        filaCPUGlobal[i] = {
          processId: -1,
          processorTime: 0,
          tempoDeQuantumGasto: 0,
          tempoNaFilaFeedback: 0,
        };
      }
    }

    //remove os processos da fila de feedback3 q foram inseridos na cpu
    filaFeedback3Global = filaFeedback3Global.filter(
      (item) => !toRemoveFromFeedback3.includes(item)
    );
  }

  function DiminuirProcessorTimeProcessosNaCPUVerificaSeAlgumTerminou() {
    for (var i = 0; i < 4; i++) {
      if (filaCPUGlobal[i].processId != -1) {
        filaCPUGlobal[i].processorTime = filaCPUGlobal[i].processorTime - 1;
        if (filaCPUGlobal[i].processorTime == 0) {
          tamanhoDiscoVariavel =
            tamanhoDiscoVariavel + parseInt(filaCPUGlobal[i].mbytes);
          filaCPUGlobal[i] = {
            processId: -1,
            processorTime: 0,
            tempoDeQuantumGasto: 0,
            tempoNaFilaFeedback: 0,
          };
        }
      }
    }
  }

  function AumentaTempoQuantumGastoParaTodosNaCpu() {
    for (var i = 0; i < 4; i++) {
      filaCPUGlobal[i].tempoDeQuantumGasto =
        filaCPUGlobal[i].tempoDeQuantumGasto + 1;
    }
  }

  function VerificaFeedback1() {
    for (var i = 0; i < 4; i++) {
      if (filaCPUGlobal[i].processId != -1) {
        if (filaCPUGlobal[i].disco > 0) {
          filaBloqueadosGlobal.push(filaCPUGlobal[i]);
          filaCPUGlobal[i] = {
            processId: -1,
            processorTime: 0,
            tempoDeQuantumGasto: 0,
            tempoNaFilaFeedback: 0,
          };
        } else if (
          filaCPUGlobal[i].tempoDeQuantumGasto >= valorDoQuantum &&
          filaCPUGlobal[i].priority == 1
        ) {
          filaCPUGlobal[i].priority = 2;
          filaCPUGlobal[i].tempoDeQuantumGasto = 0;
          filaFeedback2Global.push(filaCPUGlobal[i]);
          filaCPUGlobal[i] = {
            processId: -1,
            processorTime: 0,
            tempoDeQuantumGasto: 0,
            tempoNaFilaFeedback: 0,
          };
        }
      }
    }
  }

  function VerificarFeedback2() {
    for (var i = 0; i < 4; i++) {
      if (filaCPUGlobal[i].processId != -1) {
        if (filaCPUGlobal[i].disco > 0) {
          filaBloqueadosGlobal.push(filaCPUGlobal[i]);
          filaCPUGlobal[i] = {
            processId: -1,
            processorTime: 0,
            tempoDeQuantumGasto: 0,
            tempoNaFilaFeedback: 0,
          };
        } else if (
          filaCPUGlobal[i].tempoDeQuantumGasto >= valorDoQuantum * 2 &&
          filaCPUGlobal[i].priority == 2
        ) {
          filaCPUGlobal[i].priority = 3;
          filaCPUGlobal[i].tempoDeQuantumGasto = 0;
          filaFeedback3Global.push(filaCPUGlobal[i]);
          filaCPUGlobal[i] = {
            processId: -1,
            processorTime: 0,
            tempoDeQuantumGasto: 0,
            tempoNaFilaFeedback: 0,
          };
        }
      } else if (filaCPUGlobal[i].disco > 0) {
        filaBloqueadosGlobal.push(filaCPUGlobal[i]);
        filaCPUGlobal[i] = {
          processId: -1,
          processorTime: 0,
          tempoDeQuantumGasto: 0,
          tempoNaFilaFeedback: 0,
        };
      }
    }
  }

  function VerificarFeedback3() {
    for (var i = 0; i < 4; i++) {
      if (filaCPUGlobal[i].processId != -1) {
        if (filaCPUGlobal[i].disco > 0) {
          filaBloqueadosGlobal.push(filaCPUGlobal[i]);
          filaCPUGlobal[i] = {
            processId: -1,
            processorTime: 0,
            tempoDeQuantumGasto: 0,
            tempoNaFilaFeedback: 0,
          };
        } else if (
          filaCPUGlobal[i].tempoDeQuantumGasto >= valorDoQuantum * 3 &&
          filaCPUGlobal[i].priority === 3
        ) {
          filaCPUGlobal[i].tempoDeQuantumGasto = 0;
          filaFeedback3Global.push(filaCPUGlobal[i]);
          filaCPUGlobal[i] = {
            processId: -1,
            processorTime: 0,
            tempoDeQuantumGasto: 0,
            tempoNaFilaFeedback: 0,
          };
        }
      } else if (filaCPUGlobal[i].disco > 0) {
        filaBloqueadosGlobal.push(filaCPUGlobal[i]);
        filaCPUGlobal[i] = {
          processId: -1,
          processorTime: 0,
          tempoDeQuantumGasto: 0,
          tempoNaFilaFeedback: 0,
        };
      }
    }
  }

  function VerificarFilaProntoRealInserirNaCpu() {
    let processosNaCPUOrdenadosPorPrioridade = filaCPUGlobal.sort(
      (a, b) => b.priority - a.priority
    );
    let toRemoveFromPtempoReal = [];
    let index = 0;
    for (var i = 0; i < 4; i++) {
      processosNaCPUOrdenadosPorPrioridade = filaCPUGlobal.sort(
        (a, b) => b.priority - a.priority
      );
      if (filaCPUGlobal[i].processId == -1 && PtempoRealGlobal.length > 0) {
        filaCPUGlobal[i] = PtempoRealGlobal[index];
        toRemoveFromPtempoReal.push(PtempoRealGlobal[index]);
        index++;
      } else if (
        PtempoRealGlobal.length > 0 &&
        processosNaCPUOrdenadosPorPrioridade.filter(
          (x) => x.processId == -1 || undefined
        ).length == 0
      ) {
        if (
          filaCPUGlobal[i].processId ==
          processosNaCPUOrdenadosPorPrioridade[0].processId &&
          processosNaCPUOrdenadosPorPrioridade[0].priority !== 0
        ) {
          if (processosNaCPUOrdenadosPorPrioridade[0].priority == 1) {
            filaFeedback1Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          } else if (processosNaCPUOrdenadosPorPrioridade[0].priority == 2) {
            filaFeedback2Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          } else if (processosNaCPUOrdenadosPorPrioridade[0].priority == 3) {
            filaFeedback3Global.push(processosNaCPUOrdenadosPorPrioridade[0]);
          }
          filaCPUGlobal[i] = PtempoRealGlobal[index];
          toRemoveFromPtempoReal.push(PtempoRealGlobal[index]);
          index++;
        }
      }
      if (filaCPUGlobal[i] == undefined) {
        filaCPUGlobal[i] = {
          processId: -1,
          processorTime: 0,
          tempoDeQuantumGasto: 0,
          tempoNaFilaFeedback: 0,
        };
      }
    }
    PtempoRealGlobal = PtempoRealGlobal.filter(
      (item) => !toRemoveFromPtempoReal.includes(item)
    );
  }

  return (
    <div className="divPrincipal">
      <div className="divInfo">
        <div className="processList">
          <h1>Processos | Quantum {valorDoQuantum}</h1>
          <div>
            {listOfProcess.map((data) => {
              return (
                <p>
                  Processo: {data.processId} chegada no momento{" "}
                  {data.arrivalTime}, prioridade {data.priority} (tempo real),
                  restam {data.processorTime} segundos de duração na CPU e
                  memoria de {data.mbytes} MByte,{" "}
                  {data.disco > 0
                    ? `requer ${data.disco} unidades de disco`
                    : "sem necessidade de recursos de E/S"}
                </p>
              );
            })}
          </div>
        </div>
        <div className="divMomento">
          <h3>Momento: {count}</h3>
          <Button onClick={schedule}>Avançar tempo</Button>
          <br />
          <br />
          {/* <Button variant="primary" onClick={() => setModalShow(true)}>
            Verificar historico das filas
          </Button> */}
        </div>
        <ModalHistorico
          processId={selecteId}
          show={modalShow}
          onHide={() => setModalShow(false)}
        />
      </div>
      <div className="filas">
        <div className="tabelas suspenso">
          <h3>Pronto Suspenso</h3>
          <Table striped bordered hover size="sm">
            <tbody>
              <tr>
                {filaProntoSuspenso.map((data, index) => {
                  return (
                    <td key={index}>
                      <a
                        onClick={() => {
                          setSelectedId(data.processId);
                          setModalShow(true);
                        }}
                      >
                        {data != undefined
                          ? data.processId == -1
                            ? "Vazio"
                            : data.processId
                          : "Vazio"}
                      </a>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </Table>
        </div>
        <div className="tabelas">
          <h3>P. Tempo Real</h3>
          <Table striped bordered hover size="sm">
            <tbody>
              <tr>
                {PTempoReal.map((data, index) => {
                  return (
                    <td key={index}>
                      <a
                        onClick={() => {
                          setSelectedId(data.processId);
                          setModalShow(true);
                        }}
                      >
                        {data != undefined
                          ? data.processId == -1
                            ? "Vazio"
                            : data.processId
                          : "Vazio"}
                      </a>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </Table>
        </div>
        <div className="tabelas">
          <h3>CPUs</h3>
          <Table striped bordered hover size="sm">
            <tbody>
              <tr>
                <td>CPU 1</td>
                <td>CPU 2</td>
                <td>CPU 3</td>
                <td>CPU 4</td>
              </tr>
              <tr>
                {cpus.map((data, index) => {
                  return (
                    <td key={index}>
                      <a
                        onClick={() => {
                          setSelectedId(data.processId);
                          setModalShow(true);
                        }}
                      >
                        {data != undefined
                          ? data.processId == -1
                            ? "Vazio"
                            : data.processId
                          : "Vazio"}
                      </a>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </Table>
        </div>
        <div className="tabelas suspenso">
          <h3>Bloqueado Suspenso</h3>
          <Table striped bordered hover size="sm">
            <tbody>
              <tr>
                {filaBloqueadoSuspenso.map((data) => {
                  return (
                    <td className={
                      data.descontadoTempoDisco ? "letraLaranja" : ""
                    }>
                      <a
                        onClick={() => {
                          setSelectedId(data.processId);
                          setModalShow(true);
                        }}
                      >
                        {data != undefined
                          ? data.processId == -1
                            ? "Vazio"
                            : data.processId
                          : "Vazio"}
                      </a>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </Table>
        </div>
        <div className="tabelas">
          <h3>FEEDBACK</h3>
          <Table striped bordered hover size="sm">
            <tbody>
              <tr className="filaBackground">
                {filaFeedback1.map((data) => {
                  return (
                    <td>
                      <a
                        onClick={() => {
                          setSelectedId(data.processId);
                          setModalShow(true);
                        }}
                      >
                        {data != undefined
                          ? data.processId == -1
                            ? "Vazio"
                            : data.processId
                          : "Vazio"}
                      </a>
                    </td>
                  );
                })}
              </tr>
            </tbody>
            <br />
            <tbody>
              <tr className="filaBackground">
                {filaFeedback2.map((data, index) => {
                  return (
                    <td key={index}>
                      <a
                        onClick={() => {
                          setSelectedId(data.processId);
                          setModalShow(true);
                        }}
                      >
                        {data != undefined
                          ? data.processId == -1
                            ? "Vazio"
                            : data.processId
                          : "Vazio"}
                      </a>
                    </td>
                  );
                })}
              </tr>
            </tbody>
            <br />
            <tbody>
              <tr className="filaBackground">
                {filaFeedback3.map((data, index) => {
                  return (
                    <td key={index}>
                      <a
                        onClick={() => {
                          setSelectedId(data.processId);
                          setModalShow(true);
                        }}
                      >
                        {data != undefined
                          ? data.processId == -1
                            ? "Vazio"
                            : data.processId
                          : "Vazio"}
                      </a>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </Table>
        </div>
        <div className="tabelas hidden"></div>
        <div className="tabelas hidden"></div>
        <div className="tabelas">
          <h3>Bloqueados</h3>
          <Table striped bordered hover size="sm">
            <tbody>
              <tr>
                <tr>
                  {filaBloqueados.map((data, index) => {
                    return (
                      <td
                        className={
                          data.descontadoTempoDisco ? "letraLaranja" : ""
                        }
                        key={index}
                      >
                        <a
                          onClick={() => {
                            setSelectedId(data.processId);
                            setModalShow(true);
                          }}
                        >
                          {data != undefined
                            ? data.processId == -1
                              ? "Vazio"
                              : data.processId
                            : "Vazio"}
                        </a>
                      </td>
                    );
                  })}
                </tr>
                <p>OBS: Processos em Laranja estão usando disco</p>
              </tr>
            </tbody>
          </Table>
        </div>
        <div className="tabelas hidden"></div>
      </div>
    </div>
  );
}

export default Escalonador;
