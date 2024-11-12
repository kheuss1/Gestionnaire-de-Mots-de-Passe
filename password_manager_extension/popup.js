document
  .getElementById("set-master-password")
  .addEventListener("click", async () => {
    const masterPassword = document.getElementById("master-password").value;
    if (masterPassword) {
      try {
        const response = await chrome.runtime.sendMessage({
          action: "setMasterPassword",
          password: masterPassword,
        });
        if (response && response.status === "success") {
          document.getElementById("manager").style.display = "block";
          document.getElementById("master-password-section").style.display =
            "none";
          loadPasswords();
        } else {
          alert(
            response.message ||
              "Erreur lors de la définition du mot de passe maître."
          );
        }
      } catch (error) {
        console.error(
          "Erreur lors de la communication avec background.js :",
          error
        );
        alert("Erreur lors de la définition du mot de passe maître.");
      }
    } else {
      alert("Veuillez entrer un mot de passe maître.");
    }
  });

// Générer un mot de passe aléatoire
document.getElementById("generate-password").addEventListener("click", () => {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  alert("Mot de passe généré : " + password);
});

// Enregistrer un mot de passe
document.getElementById("save-password").addEventListener("click", async () => {
  const website = document.getElementById("website").value;
  const password = prompt("Entrez le mot de passe pour " + website);
  if (website && password) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "savePassword",
        website,
        password,
      });

      // Vérifiez la réponse ici
      if (response && response.status === "success") {
        alert("Mot de passe enregistré !");
        loadPasswords(); // Recharge la liste après l'enregistrement
      } else {
        alert(
          response?.message ||
            "Erreur lors de l'enregistrement du mot de passe."
        );
      }
    } catch (error) {
      console.error(
        "Erreur lors de la communication avec background.js :",
        error
      );
      alert("Erreur lors de l'enregistrement du mot de passe.");
    }
  } else {
    alert("Veuillez entrer un site et un mot de passe valides.");
  }
});

// Charger les mots de passe
async function loadPasswords() {
  try {
    const passwords = await chrome.runtime.sendMessage({
      action: "getPasswords",
    });
    const list = document.getElementById("password-list");
    list.innerHTML = "";

    // Vérifiez que passwords est un objet et qu'il n'est pas vide
    if (
      passwords &&
      typeof passwords === "object" &&
      Object.keys(passwords).length > 0
    ) {
      for (const [website, password] of Object.entries(passwords)) {
        if (website !== "userId") {
          // Ignorez les entrées non liées aux mots de passe

          const listItem = document.createElement("li");

          const websiteName = document.createElement("span");
          websiteName.textContent = website;

          const passwordSpan = document.createElement("span");
          passwordSpan.textContent = "●●●●●●●●";
          passwordSpan.className = "show-password";
          passwordSpan.dataset.password = password;

          passwordSpan.addEventListener("click", () => {
            passwordSpan.textContent =
              passwordSpan.textContent === "●●●●●●●●" ? password : "●●●●●●●●";
          });

          listItem.appendChild(websiteName);
          listItem.appendChild(passwordSpan);
          list.appendChild(listItem);
        }
      }
    } else {
      const emptyMessage = document.createElement("li");
      emptyMessage.textContent = "Aucun mot de passe enregistré";
      list.appendChild(emptyMessage);
    }
  } catch (error) {
    console.error("Erreur lors du chargement des mots de passe :", error);
    alert("Erreur lors du chargement des mots de passe.");
  }
}
