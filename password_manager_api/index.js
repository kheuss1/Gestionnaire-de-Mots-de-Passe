require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(cors());

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connecté à MongoDB"))
  .catch((err) => console.error("Erreur de connexion à MongoDB", err));

// Modèle de données pour les mots de passe
const PasswordSchema = new mongoose.Schema({
  userId: String,
  website: String,
  login: String,
  iv: String,
  encryptedPassword: String,
});

const Password = mongoose.model("Password", PasswordSchema);

// Middleware pour authentifier les requêtes avec JWT
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token manquant" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token invalide" });
    req.user = user;
    next();
  });
}

// Route pour connecter le super admin et obtenir un token
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  } else {
    res.status(403).json({ message: "Accès refusé" });
  }
});

// Vérification et extraction de la clé de chiffrement
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "base64");
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error("La clé de chiffrement doit être de 32 octets (256 bits).");
}

// Fonction pour chiffrer le mot de passe
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { iv: iv.toString("hex"), encryptedPassword: encrypted };
}

// Fonction pour déchiffrer le mot de passe
function decrypt(iv, encryptedPassword) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    ENCRYPTION_KEY,
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encryptedPassword, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Route pour enregistrer un mot de passe
app.post("/register-password", async (req, res) => {
  try {
    const { userId, website, login, password } = req.body;

    if (!userId || !website || !login || !password) {
      return res
        .status(400)
        .json({
          message:
            "Tous les champs (userId, website, login, password) sont requis.",
        });
    }

    const { iv, encryptedPassword } = encrypt(password);

    const passwordEntry = new Password({
      userId,
      website,
      login,
      iv,
      encryptedPassword,
    });
    await passwordEntry.save();
    console.log(`Mot de passe pour ${website} enregistré avec succès.`);
    res.status(201).json({ message: "Mot de passe enregistré" });
  } catch (error) {
    console.error(
      "Erreur lors de l'enregistrement du mot de passe :",
      error.message
    );
    res
      .status(500)
      .json({ message: "Erreur interne du serveur lors de l'enregistrement." });
  }
});

// Route pour obtenir tous les mots de passe (réservée au super admin)
app.get("/get-passwords", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Accès refusé" });
  }

  try {
    const passwords = await Password.find();
    const decryptedPasswords = passwords.map((entry) => {
      try {
        const decryptedPassword = decrypt(entry.iv, entry.encryptedPassword);
        return {
          userId: entry.userId,
          website: entry.website,
          login: entry.login,
          password: decryptedPassword,
        };
      } catch (error) {
        console.error(
          `Erreur de déchiffrement pour ${entry.website} :`,
          error.message
        );
        return {
          userId: entry.userId,
          website: entry.website,
          login: entry.login,
          password: "Erreur de déchiffrement",
        };
      }
    });

    res.json(decryptedPasswords);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des mots de passe :",
      error.message
    );
    res
      .status(500)
      .json({ message: "Erreur interne du serveur lors de la récupération." });
  }
});

app.listen(3001, () => console.log("API en écoute sur le port 3001"));
