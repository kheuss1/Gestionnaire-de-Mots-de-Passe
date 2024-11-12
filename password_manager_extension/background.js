importScripts("crypto.js");

console.log("crypto.js chargé avec succès dans background.js");

let masterKey = null;
let masterPasswordHash = null;

// Fonction pour dériver une clé à partir du mot de passe maître
async function deriveKey(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("master-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Fonction pour générer un hachage du mot de passe maître
async function hashKey(key) {
  const exportedKey = await crypto.subtle.exportKey("raw", key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", exportedKey);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Définir le mot de passe maître
async function setMasterPassword(password) {
  masterKey = await deriveKey(password);
  masterPasswordHash = await hashKey(masterKey);
  await chrome.storage.local.set({ masterPasswordHash });
}

// Vérifier le mot de passe maître
async function checkMasterPassword(password) {
  const derivedKey = await deriveKey(password);
  const hash = await hashKey(derivedKey);
  return hash === masterPasswordHash;
}

// Fonction pour envoyer les données chiffrées à l'API
async function savePasswordToAPI(userId, website, login, password) {
  try {
    const response = await fetch("http://localhost:3001/register-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, website, login, password }),
    });
    if (!response.ok) {
      throw new Error(
        "Erreur lors de l'enregistrement du mot de passe sur le serveur."
      );
    }
    return {
      status: "success",
      message: "Mot de passe enregistré sur le serveur.",
    };
  } catch (error) {
    console.error(
      "Erreur lors de l'enregistrement du mot de passe sur le serveur :",
      error
    );
    return {
      status: "error",
      message:
        "Erreur lors de l'enregistrement du mot de passe sur le serveur.",
    };
  }
}

// Gestion des messages reçus de popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message reçu dans background.js :", message);

  if (message.action === "setMasterPassword") {
    chrome.storage.local.get("masterPasswordHash", async (data) => {
      if (!data.masterPasswordHash) {
        await setMasterPassword(message.password);
        console.log("Mot de passe maître défini pour la première fois.");
        sendResponse({
          status: "success",
          message: "Mot de passe maître défini",
        });
      } else {
        masterPasswordHash = data.masterPasswordHash;
        const isValid = await checkMasterPassword(message.password);
        if (isValid) {
          masterKey = await deriveKey(message.password);
          console.log("Mot de passe maître validé avec succès.");
          sendResponse({
            status: "success",
            message: "Mot de passe maître validé",
          });
        } else {
          console.error("Mot de passe maître incorrect.");
          sendResponse({
            status: "error",
            message: "Mot de passe maître incorrect",
          });
        }
      }
    });
    return true;
  }

  if (message.action === "savePassword" && masterKey) {
    chrome.storage.local.set(
      { [`${message.website}-${message.login}`]: message.password }, // Utilise une clé unique pour chaque site et login
      async () => {
        const userId = await getUserId();
        const apiResponse = await savePasswordToAPI(
          userId,
          message.website,
          message.login, // Inclut le champ login
          message.password
        );
        sendResponse(apiResponse); // Envoie la réponse de l'API ou l'erreur appropriée
      }
    );
    return true;
  }

  if (message.action === "getPasswords" && masterKey) {
    chrome.storage.local.get(null, (items) => {
      const passwords = {};
      for (const [key, password] of Object.entries(items)) {
        if (key !== "masterPasswordHash" && key !== "userId") {
          const [website, login] = key.split("-"); // Extrait le site et le login de la clé
          if (!passwords[website]) passwords[website] = {};
          passwords[website][login] = password;
        }
      }
      sendResponse(passwords || {});
    });
    return true;
  }

  // Si aucune action n'est traitée, renvoyer une réponse d'erreur par défaut
  sendResponse({
    status: "error",
    message: "Action non prise en charge",
  });
  return true;
});

// Fonction pour obtenir un ID utilisateur unique
async function getUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get("userId", (data) => {
      if (data.userId) {
        resolve(data.userId);
      } else {
        const newUserId = "user-" + Date.now();
        chrome.storage.local.set({ userId: newUserId }, () => {
          resolve(newUserId);
        });
      }
    });
  });
}
