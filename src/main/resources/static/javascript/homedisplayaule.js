// homedisplayaule.js

/**
 * Indice corrente per la navigazione nel carosello delle aule.
 * Questa variabile globale tiene traccia di quale aula è attualmente visualizzata tra quelle disponibili.
 * @type {number}
 */
let currentIndex = 0;

/**
 * Visualizza i dettagli di un'aula specifica nell'interfaccia utente.
 * Questa è la funzione centrale per aggiornare la UI con le informazioni dell'aula selezionata.
 * @param {number} index - L'indice dell'aula nell'array `aule` da visualizzare (0-based).
 * @returns {void}
 */
function displayAula(index) {
    // Recupera l'oggetto aula dall'array globale `aule` usando l'indice fornito.
    const aula = aule[index];

    // Controllo di sicurezza: se l'oggetto aula non esiste (indice fuori limiti o array vuoto), la funzione termina.
    if (!aula) return;

    // Aggiorna il nome dell'aula nell'elemento HTML con ID 'aula-nome'.
    document.getElementById("aula-nome").textContent = aula.nome;

    // Chiama una funzione ausiliaria per aggiornare i dettagli testuali dell'aula (capienza, risorse, stato, orari).
    updateAulaDetails(aula);

    // Chiama una funzione ausiliaria per aggiornare l'immagine dell'aula.
    updateAulaImage(index, aula);

    // Recupera in modo asincrono i posti occupati per l'aula corrente dal backend.
    // Viene fatta una richiesta GET all'endpoint specifico per i posti occupati di una data aula.
    fetch(`/api/aule/${aula.id}/posti-occupati`)
        .then(response => {
            // Verifica se la risposta HTTP è stata positiva (status 2xx).
            if (!response.ok) {
                // Se la risposta non è OK, lancia un errore per essere catturato dal blocco .catch().
                throw new Error("Errore nel recupero posti occupati");
            }
            // Parsifica la risposta JSON.
            return response.json();
        })
        .then(occupati => {
            // Aggiorna l'elemento HTML con ID 'aula-posti-occupati' con il numero di posti occupati ricevuto.
            document.getElementById("aula-posti-occupati").textContent = occupati;
        })
        .catch(err => {
            // In caso di errore nella fetch, imposta un messaggio di errore e logga l'errore in console.
            document.getElementById("aula-posti-occupati").textContent = "Errore";
            console.error(err);
        });
}

/**
 * Aggiorna i dettagli testuali dell'aula, esclusi nome, posti occupati e immagine.
 * @param {Object} aula - L'oggetto aula contenente i dati da visualizzare.
 * @returns {void}
 */
function updateAulaDetails(aula) {
    // Aggiorna la capienza dell'aula.
    document.getElementById("aula-capienza").textContent = aula.capienza;

    // Chiama una funzione ausiliaria per gestire la visualizzazione delle risorse.
    updateResources(aula);

    // Chiama una funzione ausiliaria per aggiornare lo stato attivo/non attivo con stile e icona.
    updateAulaStatus(aula);

    // Imposta gli orari di apertura dell'aula.
    document.getElementById("aula-orari").textContent = "08:00 - 20:00";
}

/**
 * Gestisce la visualizzazione delle risorse dell'aula.
 * Supporta sia risorse come array di stringhe che come singola stringa.
 * @param {Object} aula - L'oggetto aula contenente le risorse (`aula.risorse`).
 * @returns {void}
 */
function updateResources(aula) {
    const risorseEl = document.getElementById("aula-risorse"); // Elemento HTML per le risorse.

    if (Array.isArray(aula.risorse)) {
        // Se `aula.risorse` è un array, lo unisce in una singola stringa separata da virgole.
        risorseEl.textContent = aula.risorse.join(", ");
    } else if (typeof aula.risorse === "string" && aula.risorse.trim() !== "") {
        // Se `aula.risorse` è una stringa non vuota, la usa direttamente.
        risorseEl.textContent = aula.risorse;
    } else {
        // Se non ci sono risorse o sono vuote, mostra un messaggio di default.
        risorseEl.textContent = "Nessuna risorsa specificata";
    }
}

/**
 * Aggiorna lo stato visivo dell'aula (attiva/non attiva) utilizzando classi CSS e icone Font Awesome.
 * @param {Object} aula - L'oggetto aula con la proprietà `attiva` (booleana).
 * @returns {void}
 */
function updateAulaStatus(aula) {
    const statoEl = document.getElementById("aula-attiva"); // Elemento HTML per lo stato.

    if (aula.attiva) {
        // Se l'aula è attiva, applica le classi CSS per lo stile "success" (verde chiaro) e un'icona di spunta.
        statoEl.className = "tag is-success is-light";
        statoEl.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Attiva';
    } else {
        // Se l'aula non è attiva, applica le classi CSS per lo stile "danger" (rosso chiaro) e un'icona di croce.
        statoEl.className = "tag is-danger is-light";
        statoEl.innerHTML = '<i class="fas fa-times-circle mr-1"></i> Non attiva';
    }
}

/**
 * Aggiorna l'immagine dell'aula mostrata nell'interfaccia utente.
 * Le immagini sono cicliche (aula1.jpg, aula2.jpg, ..., aula5.jpg) per dare varietà.
 * @param {number} index - Indice dell'aula corrente nel carosello.
 * @param {Object} aula - Oggetto aula con i dati (utilizzato per il testo alt dell'immagine).
 * @returns {void}
 */
function updateAulaImage(index, aula) {
    const img = document.getElementById("aula-image"); // Elemento HTML dell'immagine.

    // Calcola l'indice dell'immagine da usare (da 1 a 5) in modo circolare.
    // L'operatore modulo (%) garantisce che l'indice resti nell'intervallo 0-4, a cui viene aggiunto 1.
    const imgIndex = (index % 5) + 1; // Assumiamo 5 immagini: aula1.jpg, ..., aula5.jpg.

    // Imposta il percorso della sorgente dell'immagine e il testo alternativo per accessibilità.
    img.src = `/images/aula${imgIndex}.jpg`;
    img.alt = `Immagine dell'aula ${aula.nome}`;
}

/**
 * Mostra l'aula precedente nel carosello.
 * Gestisce la navigazione circolare: se l'aula corrente è la prima, passa all'ultima.
 * @returns {void}
 */
function prevAula() {
    // Controllo di sicurezza: se l'array `aule` è vuoto, la navigazione non è possibile.
    if (!aule.length) return;

    // Calcola il nuovo indice per l'aula precedente.
    // `(currentIndex - 1 + aule.length) % aule.length` gestisce il "wrap-around":
    // se `currentIndex - 1` è -1 (prima aula), aggiungendo `aule.length` si ottiene l'indice dell'ultima aula.
    currentIndex = (currentIndex - 1 + aule.length) % aule.length;

    // Chiama `displayAula` per aggiornare l'interfaccia con i dettagli dell'aula precedente.
    displayAula(currentIndex);
}

/**
 * Mostra l'aula successiva nel carosello.
 * Gestisce la navigazione circolare: se l'aula corrente è l'ultima, passa alla prima.
 * @returns {void}
 */
function nextAula() {
    // Controllo di sicurezza: se l'array `aule` è vuoto.
    if (!aule.length) return;

    // Calcola il nuovo indice per l'aula successiva.
    // `(currentIndex + 1) % aule.length` gestisce il "wrap-around":
    // se `currentIndex + 1` supera `aule.length - 1` (ultima aula), si riparte da 0 (prima aula).
    currentIndex = (currentIndex + 1) % aule.length;

    // Chiama `displayAula` per aggiornare l'interfaccia con i dettagli dell'aula successiva.
    displayAula(currentIndex);
}

// Sezione di inizializzazione che viene eseguita una volta che il DOM è completamente caricato.
document.addEventListener("DOMContentLoaded", () => {
    // Verifica se l'array globale `aule` (presumibilmente popolato lato server e disponibile globalmente)
    // esiste ed ha almeno un elemento.
    if (Array.isArray(aule) && aule.length > 0) {
        displayAula(0); // Se ci sono aule, visualizza i dettagli della prima aula (indice 0).
    } else {
        // Se non ci sono aule disponibili, aggiorna il nome dell'aula per indicare questa condizione.
        document.getElementById("aula-nome").textContent = "Nessuna aula disponibile";
        // Si potrebbe anche pensare di disabilitare i pulsanti di navigazione `prevAula` e `nextAula` qui.
    }
});