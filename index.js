var admin = require("firebase-admin");
const express = require("express");

var serviceAccount = require("./ecobreathdatabase-firebase-adminsdk-fbsvc-9a84de71af.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ecobreathdatabase-default-rtdb.firebaseio.com"
});

const db = admin.database();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API do EcoBreath está rodando!");
});


async function reprocessarDados() {
  try {
    const snapshot1 = await db.ref("/OutrosParametros").once("value");
    const dadosSensores = snapshot1.val();
    const snapshot2 = await db.ref("/SensoresPPM").once("value");
    const dadosSensores2 = snapshot2.val();

    if (!dadosSensores) {
      console.log("Nenhum dado de sensores encontrado");
      return;
    }

    const agora = Date.now();

    const dataHoraBrasil = new Date().toLocaleString("sv-SE", {
      timeZone: "America/Manaus",
      hour12: false
    }).replace(" ", "_").replace(":", "-").slice(0, 16);

    const dadosParaSalvar = {
      CCOV: dadosSensores.CCOV || 0,
      CO2: dadosSensores2.CO2In || 0,
      timestamp: agora,
    };

    await db.ref(`/HistoricoSensores/${dataHoraBrasil}`).set(dadosParaSalvar);

    console.log("Dados salvos no histórico:", dataHoraBrasil);
  } catch (error) {
    console.error("Erro ao reprocessar dados:", error);
  }
}

// Executa a função a cada 1 minuto (60000ms)
setInterval(reprocessarDados, 60000);
reprocessarDados(); // roda uma vez ao iniciar

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
