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
  const login = document.getElementById("login").value;
  const password = prompt("Entrez le mot de passe pour " + website);
  if (website && login && password) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "savePassword",
        website,
        login,
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
const ITEMS_PER_PAGE = 5; // Nombre d'éléments par page
let currentPage = 1; // Page actuelle

// Fonction pour charger les mots de passe avec pagination
async function loadPasswords(page = 1) {
  try {
    const passwords = await chrome.runtime.sendMessage({
      action: "getPasswords",
    });
    const list = document.getElementById("password-list");
    list.innerHTML = "";
    currentPage = page;

    if (
      passwords &&
      typeof passwords === "object" &&
      Object.keys(passwords).length > 0
    ) {
      const entries = []; // Créer une liste plate de tous les éléments de `passwords`

      for (const [website, logins] of Object.entries(passwords)) {
        for (const [login, password] of Object.entries(logins)) {
          entries.push({ website, login, password });
        }
      }

      // Calculer les pages de la pagination
      const totalItems = entries.length;
      const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const pageEntries = entries.slice(start, end);

      // Afficher les éléments de la page actuelle
      pageEntries.forEach(({ website, login, password }) => {
        const listItem = document.createElement("li");

        const websiteHeader = document.createElement("div");
        websiteHeader.className = "password-item-header";
        websiteHeader.textContent = `Site: ${website}`;

        const contentDiv = document.createElement("div");
        contentDiv.className = "password-item-content";

        const loginSpan = document.createElement("span");
        loginSpan.textContent = `Login: ${login}`;

        const passwordSpan = document.createElement("span");
        passwordSpan.textContent = "●●●●●●●●";
        passwordSpan.className = "show-password";
        passwordSpan.dataset.password = password;

        passwordSpan.addEventListener("click", () => {
          passwordSpan.textContent =
            passwordSpan.textContent === "●●●●●●●●" ? password : "●●●●●●●●";
        });

        contentDiv.appendChild(loginSpan);
        contentDiv.appendChild(passwordSpan);

        listItem.appendChild(websiteHeader);
        listItem.appendChild(contentDiv);
        list.appendChild(listItem);
      });

      // Afficher la pagination
      renderPagination(totalPages);
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

// Fonction pour afficher les boutons de pagination
function renderPagination(totalPages) {
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = ""; // Réinitialise les boutons de pagination

  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    pageButton.className = "pagination-button";
    if (i === currentPage) {
      pageButton.classList.add("active");
    }

    pageButton.addEventListener("click", () => {
      loadPasswords(i);
    });

    paginationContainer.appendChild(pageButton);
  }
}
