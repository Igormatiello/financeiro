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
    console.log('Iniciando buscarUltimoCodigo');
    const codigosRef = db.collection("Códigos");
    const querySnapshot = await codigosRef.get();
    if (querySnapshot.empty) {
      ultimoCodigo = "0018345-90.2024.8.16.0021";
      ultimoDiminuiu15 = true;
    } else {
      // Ordenar pelo número inicial do código (parte antes do '-') em ordem decrescente
      const codigos = querySnapshot.docs.map(doc => ({
        valor: doc.data().valor,
        diminuiu15: doc.data().diminuiu15
      }));
      codigos.sort((a, b) => {
        const numA = parseInt(a.valor.split('-')[0], 10);
        const numB = parseInt(b.valor.split('-')[0], 10);
        return numB - numA;
      });
      ultimoCodigo = codigos[0].valor;
      ultimoDiminuiu15 = codigos[0].diminuiu15;
    }
    console.log('Atualizando ultimoCodigoSpan:', ultimoCodigo);
    ultimoCodigoSpan.textContent = ultimoCodigo;
    [proximoCodigo, proximoDiminuiu15] = gerarNovoCodigo(ultimoCodigo, ultimoDiminuiu15);
    console.log('Atualizando proximoCodigoSpan:', proximoCodigo);
    proximoCodigoSpan.textContent = proximoCodigo;
    console.log('Finalizando buscarUltimoCodigo');
  }

  // Função para mostrar mensagem
  function mostrarMensagem(msg, tipo = 'info') {
    mensagemDiv.textContent = msg;
    mensagemDiv.style.color = tipo === 'erro' ? '#dc2626' : '#2563eb';
    setTimeout(() => { mensagemDiv.textContent = ''; }, 3000);

    // Mensagem flutuante no topo
    const msgFloat = document.getElementById('mensagemFlutuante');
    msgFloat.textContent = msg;
    msgFloat.style.background = tipo === 'erro' ? '#dc2626' : '#22c55e';
    msgFloat.style.display = 'block';
    msgFloat.style.opacity = '1';
    // Fade out após 4 segundos
    setTimeout(() => {
      msgFloat.style.transition = 'opacity 0.5s';
      msgFloat.style.opacity = '0';
      setTimeout(() => {
        msgFloat.style.display = 'none';
        msgFloat.style.transition = '';
      }, 500);
    }, 4000);
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
    console.log('Clique em Gerar Próximo Código');
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
        console.log('Finalizou geração do primeiro código');
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
        console.log('Código já existia, abortando geração');
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
      console.log('Finalizou geração de novo código');
    } catch (error) {
      console.error("Erro ao gerar código:", error);
      mostrarMensagem('Erro ao gerar o código.', 'erro');
    } finally {
      setTimeout(() => { btnGerar.disabled = false; }, 4000);
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

  // --- LOGIN ESTÁTICO ---
  const USUARIO_FIXO = 'igor';
  const SENHA_FIXA = 'Exit9090';

  const loginContainer = document.getElementById('loginContainer');
  const mainContainer = document.getElementById('mainContainer');
  const loginForm = document.getElementById('loginForm');
  const loginMensagem = document.getElementById('loginMensagem');

  function mostrarMain() {
    loginContainer.style.display = 'none';
    mainContainer.style.display = '';
  }
  function mostrarLogin() {
    loginContainer.style.display = '';
    mainContainer.style.display = 'none';
  }

  function estaLogado() {
    return localStorage.getItem('logadoFinanceiro') === 'sim';
  }

  function fazerLogout() {
    localStorage.removeItem('logadoFinanceiro');
    mostrarLogin();
  }

  if (estaLogado()) {
    mostrarMain();
  } else {
    mostrarLogin();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const usuario = document.getElementById('loginUsuario').value;
      const senha = document.getElementById('loginSenha').value;
      if (usuario === USUARIO_FIXO && senha === SENHA_FIXA) {
        localStorage.setItem('logadoFinanceiro', 'sim');
        loginMensagem.textContent = 'Login realizado com sucesso!';
        loginMensagem.style.color = '#16a34a';
        setTimeout(() => { mostrarMain(); loginMensagem.textContent = ''; }, 2000);
      } else {
        loginMensagem.textContent = 'Usuário ou senha inválidos!';
        loginMensagem.style.color = '#dc2626';
      }
    });
  }

  // --- INSERÇÃO MANUAL DE CÓDIGO ---
  const btnAbrirInserirManual = document.getElementById('abrirInserirManual');
  const inserirManualBox = document.getElementById('inserirManualBox');
  const formInserirManual = document.getElementById('formInserirManual');
  const cancelarInserirManual = document.getElementById('cancelarInserirManual');
  const mensagemInserirManual = document.getElementById('mensagemInserirManual');

  if (btnAbrirInserirManual) {
    btnAbrirInserirManual.addEventListener('click', function() {
      inserirManualBox.style.display = '';
      mensagemInserirManual.textContent = '';
      document.getElementById('codigoManual').value = '';
    });
  }
  if (cancelarInserirManual) {
    cancelarInserirManual.addEventListener('click', function() {
      inserirManualBox.style.display = 'none';
      mensagemInserirManual.textContent = '';
    });
  }
  if (formInserirManual) {
    formInserirManual.addEventListener('submit', async function(e) {
      e.preventDefault();
      const codigo = document.getElementById('codigoManual').value.trim();
      const diminui = document.querySelector('input[name="diminuiManual"]:checked').value === '15';
      if (!codigo.match(/^\d{7}-\d{2}\.\d{4}\.8\.16\.0021$/)) {
        mensagemInserirManual.textContent = 'Formato inválido!';
        mensagemInserirManual.style.color = '#dc2626';
        return;
      }
      try {
        const codigosRef = db.collection('Códigos');
        // Verifica se já existe esse código
        const snapshot = await codigosRef.where('valor', '==', codigo).get();
        if (!snapshot.empty) {
          mensagemInserirManual.textContent = 'Esse código já existe!';
          mensagemInserirManual.style.color = '#dc2626';
          return;
        }
        // Insere o novo código manualmente
        await codigosRef.add({ valor: codigo, diminuiu15: diminui });
        mensagemInserirManual.textContent = 'Novo código inserido!';
        mensagemInserirManual.style.color = '#16a34a';
        inserirManualBox.style.display = 'none';
        await buscarUltimoCodigo();
        await atualizarHistorico();
        // Mensagem flutuante no topo
        mostrarMensagem(`Novo código inserido: ${codigo} (decremento: ${diminui ? '15' : '18'})`, 'info');
      } catch (err) {
        mensagemInserirManual.textContent = 'Erro ao inserir!';
        mensagemInserirManual.style.color = '#dc2626';
      }
    });
  }
});