const admin = require("firebase-admin");
const express = require("express");

const requiredEnv = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  throw new Error(`Variáveis de ambiente ausentes: ${missingEnv.join(", ")}`);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ||
    "https://ecobreathdatabase-default-rtdb.firebaseio.com",
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
    const snapshot3 = await db.ref("/TempeUmid").once("value");
    const dadosSensores3 = snapshot3.val();

    if (!dadosSensores) {
      console.log("Nenhum dado de sensores encontrado");
      return;
    }

    const agora = Date.now();
    const dataHoraBrasil = new Date()
      .toLocaleString("sv-SE", {
        timeZone: "America/Manaus",
        hour12: false,
      })
      .replace(" ", "_")
      .replace(":", "-")
      .slice(0, 16);

    const dadosParaSalvar = {
      CCOV: dadosSensores.CCOV || 0,
      CO2: dadosSensores2?.CO2Out || 0,
      CO: dadosSensores2?.CO || 0,
      Temperatura: dadosSensores3?.Temperatura || 0,
      timestamp: agora,
    };

    await db.ref(`/HistoricoSensores/${dataHoraBrasil}`).set(dadosParaSalvar);
    console.log("Dados salvos no histórico:", dataHoraBrasil);
  } catch (error) {
    console.error("Erro ao reprocessar dados:", error);
  }
}

setInterval(reprocessarDados, 60000);
reprocessarDados();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
