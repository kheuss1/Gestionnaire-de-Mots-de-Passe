// Fonction pour dériver une clé de chiffrement à partir d'un mot de passe
async function deriveKey(password) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Remarque : rendre la clé extractable pour l'exportation
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("unique-salt"), // Utilisez un salt unique pour votre application
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, // <-- Rendre la clé extractable
    ["encrypt", "decrypt"]
  );
}

// Chiffre les données avec une clé AES-GCM
async function encryptData(data, key) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Génère un IV unique
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(data)
  );
  return {
    iv: Array.from(iv),
    encrypted: Array.from(new Uint8Array(encrypted)),
  };
}

// Déchiffre les données avec une clé AES-GCM
async function decryptData(encryptedData, key) {
  const { iv, encrypted } = encryptedData;
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(encrypted)
  );
  return new TextDecoder().decode(decrypted);
}
