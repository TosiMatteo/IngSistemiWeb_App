// homedisplayaule.js

/**
 * Indice corrente per la navigazione nel carosello delle aule.
 * @type {number}
 */
let currentIndex = 0;

/**
 * Visualizza i dettagli di un'aula specifica nell'interfaccia utente.
 * @param {number} index - L'indice dell'aula nell'array `aule` da visualizzare.
 * @returns {void}
 */
function displayAula(index) {
    // Recupera l'oggetto aula dall'array
    const aula = aule[index];

    // Controllo di sicurezza per indice non valido
    if (!aula) return;

    // Aggiorna il nome dell'aula
    document.getElementById("aula-nome").textContent = aula.nome;

    // Aggiorna dettagli e immagine dell'aula
    updateAulaDetails(aula);
    updateAulaImage(aula);

    // Recupera i posti occupati dal backend
    fetch(`/api/aule/${aula.id}/posti-occupati`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Errore nel recupero posti occupati");
            }
            return response.json();
        })
        .then(occupati => {
            document.getElementById("aula-posti-occupati").textContent = occupati;
        })
        .catch(err => {
            document.getElementById("aula-posti-occupati").textContent = "Errore";
            console.error(err);
        });
}

/**
 * Aggiorna i dettagli testuali dell'aula.
 * @param {Object} aula - L'oggetto aula contenente i dati.
 * @returns {void}
 */
function updateAulaDetails(aula) {
    // Aggiorna la capienza
    document.getElementById("aula-capienza").textContent = aula.capienza;

    // Aggiorna risorse e stato
    updateResources(aula);
    updateAulaStatus(aula);

    // Imposta orari di apertura
    document.getElementById("aula-orari").textContent = "08:00 - 20:00";
}

/**
 * Gestisce la visualizzazione delle risorse dell'aula.
 * @param {Object} aula - L'oggetto aula con le risorse.
 * @returns {void}
 */
function updateResources(aula) {
    const risorseEl = document.getElementById("aula-risorse");

    if (Array.isArray(aula.risorse)) {
        // Unisce array di risorse in stringa
        risorseEl.textContent = aula.risorse.join(", ");
    } else if (typeof aula.risorse === "string" && aula.risorse.trim() !== "") {
        // Usa la stringa direttamente
        risorseEl.textContent = aula.risorse;
    } else {
        // Messaggio default per risorse mancanti
        risorseEl.textContent = "Nessuna risorsa specificata";
    }
}

/**
 * Aggiorna lo stato visivo dell'aula con classi CSS e icone.
 * @param {Object} aula - L'oggetto aula con la proprietà `attiva`.
 * @returns {void}
 */
function updateAulaStatus(aula) {
    const statoEl = document.getElementById("aula-attiva");

    if (aula.attiva) {
        // Stile per aula attiva
        statoEl.className = "tag is-success is-light";
        statoEl.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Attiva';
    } else {
        // Stile per aula non attiva
        statoEl.className = "tag is-danger is-light";
        statoEl.innerHTML = '<i class="fas fa-times-circle mr-1"></i> Non attiva';
    }
}

/**
 * Aggiorna l'immagine dell'aula.
 * @param {Object} aula - L'oggetto aula con il campo `imageUrl`.
 * @returns {void}
 */
function updateAulaImage(aula) {
    const img = document.getElementById("aula-image");

    // Usa l'immagine specificata o fallback su default
    if (aula.imageUrl && aula.imageUrl.trim() !== "") {
        img.src = aula.imageUrl;
    } else {
        img.src = "/images/placeholder.jpg";
    }

    // Testo alternativo per accessibilità
    img.alt = `Immagine dell'aula ${aula.nome}`;
}

/**
 * Mostra l'aula precedente nel carosello con navigazione circolare.
 * @returns {void}
 */
function prevAula() {
    if (!aule.length) return;

    // Calcola il nuovo indice per l'aula precedente.
    // `(currentIndex - 1 + aule.length) % aule.length` gestisce il "wrap-around":
    // se `currentIndex - 1` è -1 (prima aula), aggiungendo `aule.length` si ottiene l'indice dell'ultima aula.
    currentIndex = (currentIndex - 1 + aule.length) % aule.length;
    displayAula(currentIndex);
}

/**
 * Mostra l'aula successiva nel carosello con navigazione circolare.
 * @returns {void}
 */
function nextAula() {
    if (!aule.length) return;

    // Calcola il nuovo indice per l'aula successiva.
    // `(currentIndex + 1) % aule.length` gestisce il "wrap-around":
    // se `currentIndex + 1` supera `aule.length - 1` (ultima aula), si riparte da 0 (prima aula).
    currentIndex = (currentIndex + 1) % aule.length;
    displayAula(currentIndex);
}

// Inizializzazione al caricamento del DOM
document.addEventListener("DOMContentLoaded", () => {
    if (Array.isArray(aule) && aule.length > 0) {
        // Visualizza la prima aula
        displayAula(0);
    } else {
        // Gestione caso senza aule
        document.getElementById("aula-nome").textContent = "Nessuna aula disponibile";
    }
});
