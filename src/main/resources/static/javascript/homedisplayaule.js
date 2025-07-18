// homedisplayaule.js

/**
 * Indice corrente per la navigazione nel carosello delle aule.
 * @type {number}
 */
let currentIndex = 0;
let aule = [];

/**
 * Funzione principale che carica le aule attive dal server e avvia il carosello.
 * Viene eseguita al caricamento della pagina.
 */
async function initCarousel() {
    try {
        // 1. Chiede al server l'elenco aggiornato delle aule attive.
        const response = await axios.get('/api/aule');
        aule = response.data; // Popola l'array globale con i dati freschi.

        // 2. Avvia la visualizzazione del carosello.
        if (Array.isArray(aule) && aule.length > 0) {
            displayAula(0); // Mostra la prima aula.
        } else {
            document.getElementById("aula-nome").textContent = "Nessuna aula disponibile";
        }
    } catch (error) {
        console.error("Errore nel caricamento delle aule:", error);
        document.getElementById("aula-nome").textContent = "Errore nel caricamento delle aule";
    }
}

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

    // Orari
    const apertura = aula.orarioApertura ? aula.orarioApertura.slice(0, 5) : "N/D";
    const chiusura = aula.orarioChiusura ? aula.orarioChiusura.slice(0, 5) : "N/D";
    document.getElementById("aula-orari").textContent = `${apertura} - ${chiusura}`;
}

/**
 * Gestisce la visualizzazione delle risorse dell'aula.
 * @param {Object} aula - L'oggetto aula con le risorse.
 * @returns {void}
 */
function updateResources(aula) {
    const risorseEl = document.getElementById("aula-risorse");

    // Controlla se la proprietà 'risorseString' esiste nell'oggetto aula
    // e se non è vuota, per usare la stringa già formattata dal backend.
    if (aula.risorseString && aula.risorseString.trim() !== "") {
        risorseEl.textContent = aula.risorseString;
    } else {
        // Messaggio di default se non ci sono risorse o la stringa è vuota
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

    img.src = "/images/placeholder.jpg"; // Immagine di default

    // Se l'aula ha un percorso immagine specificato usa quello.
    if (aula.imageUrl && aula.imageUrl.trim() !== "") {
        img.src = aula.imageUrl;
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

/**
 * Event Listener che avvia tutto al caricamento del DOM.
 */
document.addEventListener("DOMContentLoaded", () => {
    initCarousel(); // Avvia il processo di caricamento dinamico.
});
