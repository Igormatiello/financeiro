import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAk6Kmz8LKrGPZZg1JB0PSoBV0LsTJnOlA",
  authDomain: "gerador-bc6a5.firebaseapp.com",
  projectId: "gerador-bc6a5",
  storageBucket: "gerador-bc6a5.firebasestorage.app",
  messagingSenderId: "460162102254",
  appId: "1:460162102254:web:3d35e239718b63b8dbd4ff",
  measurementId: "G-8G4J1TLW7P"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById("gerarBtn").addEventListener("click", gerarProximoCodigo);

async function gerarProximoCodigo() {
  const resultado = document.getElementById("resultado");
  try {
    const codigosRef = collection(db, "Códigos");
    const q = query(codigosRef, orderBy("__name__", "desc"), limit(1));
    const snapshot = await getDocs(q);

    let novoCodigo;
    let novoDiminuiu15;

    if (snapshot.empty) {
      // Caso base: nenhum código ainda criado
      novoCodigo = "0018345-90.2024.8.16.0021";
      novoDiminuiu15 = true;
    } else {
      const ultimoDoc = snapshot.docs[0].data();
      const ultimoValor = ultimoDoc.valor;
      const ultimoDiminuiu15 = ultimoDoc.diminuiu15;

      // Gera próximo código
      const [novo, proximoDiminuiu15] = gerarNovoCodigo(ultimoValor, ultimoDiminuiu15);
      novoCodigo = novo;
      novoDiminuiu15 = proximoDiminuiu15;
    }

    // Salva no Firestore
    await addDoc(codigosRef, {
      valor: novoCodigo,
      diminuiu15: novoDiminuiu15
    });

    resultado.textContent = `Novo código gerado: ${novoCodigo}`;
  } catch (error) {
    console.error("Erro ao gerar código:", error);
    resultado.textContent = "Erro ao gerar o código.";
  }
}

function gerarNovoCodigo(codigoAtual, diminuiu15Atual) {
  const [parte1, restante] = codigoAtual.split("-");
  const [parte2Raw, ...finalFixo] = restante.split(".");
  const fixo = finalFixo.join(".");

  const numero1 = String(parseInt(parte1, 10) + 1).padStart(parte1.length, "0");
  const parte2 = parseInt(parte2Raw, 10);

  const decremento = diminuiu15Atual ? 15 : 18;
  let novoParte2 = parte2 - decremento;

  // Se caiu abaixo de 1, iniciar novo ciclo e corrigir
  if (novoParte2 < 1) {
    novoParte2 += 99;
  }

  // Nunca pode ser 00
  if (novoParte2 === 0) {
    novoParte2 = 99;
  }

  const novoParte2Str = String(novoParte2).padStart(2, "0");

  // Troca o booleano dependendo do ponto de ciclo
  let proximoDiminuiu15;

  if (diminuiu15Atual && parte2 - 15 < 1) {
    proximoDiminuiu15 = false; // fim do ciclo de 15
  } else if (!diminuiu15Atual && parte2 - 18 < 1) {
    proximoDiminuiu15 = true; // fim do ciclo de 18
  } else {
    proximoDiminuiu15 = diminuiu15Atual; // mantém o atual
  }

  return [`${numero1}-${novoParte2Str}.${fixo}`, proximoDiminuiu15];
}