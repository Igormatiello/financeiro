document.addEventListener('DOMContentLoaded', function() {
  // Configuração do Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyAk6Kmz8LKrGPZZg1JB0PSoBV0LsTJnOlA",
    authDomain: "gerador-bc6a5.firebaseapp.com",
    projectId: "gerador-bc6a5",
    storageBucket: "gerador-bc6a5.appspot.com",
    messagingSenderId: "460162102254",
    appId: "1:460162102254:web:3d35e239718b63b8dbd4ff",
    measurementId: "G-8G4J1TLW7P"
  };

  // Inicializa o Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  // Elementos da interface
  const ultimoCodigoSpan = document.getElementById("ultimoCodigo");
  const proximoCodigoSpan = document.getElementById("proximoCodigo");
  const historicoDiv = document.getElementById("historicoCodigos");
  const mensagemDiv = document.getElementById("mensagem");
  const btnGerar = document.getElementById("gerarBtn");
  const btnResetar = document.getElementById("resetarBtn");
  const btnCopiarUltimo = document.getElementById("copiarUltimo");
  const btnCopiarProximo = document.getElementById("copiarProximo");

  let ultimoCodigo = null;
  let ultimoDiminuiu15 = true;
  let proximoCodigo = null;
  let proximoDiminuiu15 = true;

  // Função para atualizar histórico
  async function atualizarHistorico() {
    const codigosRef = db.collection("Códigos");
    const querySnapshot = await codigosRef.get();
    // Ordenar pelo número inicial do código (parte antes do '-') em ordem decrescente
    const codigos = querySnapshot.docs.map(doc => doc.data().valor);
    codigos.sort((a, b) => {
      const numA = parseInt(a.split('-')[0], 10);
      const numB = parseInt(b.split('-')[0], 10);
      return numB - numA;
    });
    let html = '<ul>';
    codigos.forEach(codigo => {
      html += `<li>${codigo}</li>`;
    });
    html += '</ul>';
    historicoDiv.innerHTML = html;
  }

  // Função para buscar último código
  async function buscarUltimoCodigo() {
    const codigosRef = db.collection("Códigos");
    const querySnapshot = await codigosRef.orderBy("__name__", "desc").limit(1).get();
    if (querySnapshot.empty) {
      ultimoCodigo = "0018345-90.2024.8.16.0021";
      ultimoDiminuiu15 = true;
    } else {
      const ultimoDoc = querySnapshot.docs[0].data();
      ultimoCodigo = ultimoDoc.valor;
      ultimoDiminuiu15 = ultimoDoc.diminuiu15;
    }
    ultimoCodigoSpan.textContent = ultimoCodigo;
    [proximoCodigo, proximoDiminuiu15] = gerarNovoCodigo(ultimoCodigo, ultimoDiminuiu15);
    proximoCodigoSpan.textContent = proximoCodigo;
  }

  // Função para mostrar mensagem
  function mostrarMensagem(msg, tipo = 'info') {
    mensagemDiv.textContent = msg;
    mensagemDiv.style.color = tipo === 'erro' ? '#dc2626' : '#2563eb';
    setTimeout(() => { mensagemDiv.textContent = ''; }, 3000);
  }

  // Função para copiar texto
  function copiarTexto(texto) {
    navigator.clipboard.writeText(texto).then(() => {
      mostrarMensagem('Copiado para a área de transferência!');
    });
  }

  // Função para gerar novo código
  function gerarNovoCodigo(codigoAtual, diminuiu15Atual) {
    const [parte1, restante] = codigoAtual.split("-");
    const [parte2Raw, ...finalFixo] = restante.split(".");
    const fixo = finalFixo.join(".");

    const numero1 = String(parseInt(parte1, 10) + 1).padStart(parte1.length, "0");
    const parte2 = parseInt(parte2Raw, 10);
    const decremento = diminuiu15Atual ? 15 : 18;
    let novoParte2 = parte2 - decremento;

    if (novoParte2 < 1) novoParte2 += 99;
    if (novoParte2 === 0) novoParte2 = 99;

    const novoParte2Str = String(novoParte2).padStart(2, "0");
    let proximoDiminuiu15;

    if (diminuiu15Atual && parte2 - 15 < 1) {
      proximoDiminuiu15 = false;
    } else if (!diminuiu15Atual && parte2 - 18 < 1) {
      proximoDiminuiu15 = true;
    } else {
      proximoDiminuiu15 = diminuiu15Atual;
    }

    return [`${numero1}-${novoParte2Str}.${fixo}`, proximoDiminuiu15];
  }

  // Evento: Gerar próximo código
  btnGerar.addEventListener("click", async function() {
    if (btnGerar.disabled) return;
    btnGerar.disabled = true;
    try {
      const codigosRef = db.collection("Códigos");
      // Buscar todos os códigos do banco
      const querySnapshot = await codigosRef.get();
      if (querySnapshot.empty) {
        // Nenhum código ainda, insere o primeiro
        await codigosRef.add({
          valor: "0018345-90.2024.8.16.0021",
          diminuiu15: true
        });
        mostrarMensagem('Primeiro código gerado!');
        await buscarUltimoCodigo();
        await atualizarHistorico();
        return;
      }
      // Encontrar o maior número inicial
      let maiorNumero = -1;
      let codigoBase = null;
      let diminuiu15Base = true;
      querySnapshot.forEach(doc => {
        const valor = doc.data().valor;
        const diminuiu15 = doc.data().diminuiu15;
        const num = parseInt(valor.split('-')[0], 10);
        if (num > maiorNumero) {
          maiorNumero = num;
          codigoBase = valor;
          diminuiu15Base = diminuiu15;
        }
      });
      // Calcular o próximo
      const [novoCodigo, novoDiminuiu15] = gerarNovoCodigo(codigoBase, diminuiu15Base);
      // Validar se já existe
      let existe = false;
      querySnapshot.forEach(doc => {
        if (doc.data().valor === novoCodigo) existe = true;
      });
      if (existe) {
        mostrarMensagem('Código já gerado, aguarde o próximo!', 'erro');
        await buscarUltimoCodigo();
        await atualizarHistorico();
        return;
      }
      // Salvar
      await codigosRef.add({
        valor: novoCodigo,
        diminuiu15: novoDiminuiu15
      });
      mostrarMensagem('Novo código gerado!');
      await buscarUltimoCodigo();
      await atualizarHistorico();
    } catch (error) {
      console.error("Erro ao gerar código:", error);
      mostrarMensagem('Erro ao gerar o código.', 'erro');
    } finally {
      setTimeout(() => { btnGerar.disabled = false; }, 2000);
    }
  });

  // Evento: Resetar sequência
  btnResetar.addEventListener("click", async function() {
    if (!confirm('Tem certeza que deseja resetar a sequência? Isso apagará todos os códigos.')) return;
    try {
      // Apaga todos os documentos da coleção
      const codigosRef = db.collection("Códigos");
      const snapshot = await codigosRef.get();
      const batch = db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      mostrarMensagem('Sequência resetada!');
      await buscarUltimoCodigo();
      await atualizarHistorico();
    } catch (error) {
      console.error("Erro ao resetar:", error);
      mostrarMensagem('Erro ao resetar.', 'erro');
    }
  });

  // Evento: Copiar último código
  btnCopiarUltimo.addEventListener("click", function() {
    copiarTexto(ultimoCodigoSpan.textContent);
  });

  // Evento: Copiar próximo código
  btnCopiarProximo.addEventListener("click", function() {
    copiarTexto(proximoCodigoSpan.textContent);
  });

  // Inicialização
  (async function init() {
    await buscarUltimoCodigo();
    await atualizarHistorico();
  })();
});