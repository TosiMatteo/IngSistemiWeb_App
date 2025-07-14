// admingestioneaula.js

document.addEventListener("DOMContentLoaded", () => {
    // Riferimenti agli elementi del DOM
    const aulaSelect = document.getElementById("aulaSelect");
    const aulaDetailsDiv = document.getElementById("aulaDetails");
    const btnNewAula = document.getElementById("btn-new-aula");
    const btnSaveAula = document.getElementById("btn-save-aula");
    const btnCancel = document.getElementById("btn-cancel");

    // Campi del form
    const aulaNomeInput = document.getElementById("aulaNome");
    const aulaCapienzaInput = document.getElementById("aulaCapienza");
    const aulaRisorseInput = document.getElementById("aulaRisorse");
    const aulaAttivaCheckbox = document.getElementById("aulaAttiva");

    // Campi specifici per l'immagine
    const imageUploadField = document.getElementById("image-upload-field");
    const imagePathField = document.getElementById("image-path-field");
    const aulaImmagineFileInput = document.getElementById("aulaImmagineFile");
    const aulaImageUrlInput = document.getElementById("aulaImageUrl");
    const fileNameDisplay = document.getElementById("file-name-display");

    // Stato per sapere se stiamo creando o modificando
    let isCreateMode = false;

    // Imposta il token CSRF per Axios
    const csrfToken = document.querySelector('meta[name="_csrf"]').getAttribute('content');
    const csrfHeader = document.querySelector('meta[name="_csrf_header"]').getAttribute('content');
    axios.defaults.headers.common[csrfHeader] = csrfToken;

    /**
     * Mostra e popola il form per MODIFICARE un'aula esistente.
     */
    function showEditForm() {
        isCreateMode = false;
        const selectedOption = aulaSelect.options[aulaSelect.selectedIndex];

        if (!selectedOption.value) {
            aulaDetailsDiv.style.display = "none";
            return;
        }

        // Mostra il campo del percorso testuale e nascondi quello di upload
        imagePathField.style.display = 'block';
        imageUploadField.style.display = 'none';

        // Popola i campi del form
        aulaNomeInput.value = selectedOption.text;
        aulaCapienzaInput.value = selectedOption.getAttribute("data-capienza");
        aulaRisorseInput.value = selectedOption.getAttribute("data-risorse");
        aulaImageUrlInput.value = selectedOption.getAttribute("data-imageurl") || 'Nessuna immagine specificata';
        aulaAttivaCheckbox.checked = selectedOption.getAttribute("data-attiva") === "true";

        btnSaveAula.textContent = "Aggiorna Aula";
        aulaDetailsDiv.style.display = "block";
    }

    /**
     * Mostra un form vuoto per CREARE una nuova aula.
     */
    function showCreateForm() {
        isCreateMode = true;
        aulaSelect.value = "";

        // Mostra il campo di upload e nascondi quello del percorso testuale
        imagePathField.style.display = 'none';
        imageUploadField.style.display = 'block';

        // Pulisci tutti i campi del form
        aulaNomeInput.value = "";
        aulaCapienzaInput.value = "";
        aulaRisorseInput.value = "";
        aulaImmagineFileInput.value = null; // Resetta il file input
        fileNameDisplay.textContent = "Nessun file selezionato";
        aulaAttivaCheckbox.checked = true;

        btnSaveAula.textContent = "Crea Aula";
        aulaDetailsDiv.style.display = "block";
    }

    /**
     * Gestisce il salvataggio (creazione o aggiornamento) dell'aula.
     */
    function saveAula() {
        if (isCreateMode) {
            // --- Logica di CREAZIONE (POST con FormData) ---
            const formData = new FormData();
            formData.append("nome", aulaNomeInput.value);
            formData.append("capienza", aulaCapienzaInput.value);
            formData.append("risorse", aulaRisorseInput.value);
            formData.append("attiva", aulaAttivaCheckbox.checked);

            if (aulaImmagineFileInput.files.length > 0) {
                formData.append("immagineFile", aulaImmagineFileInput.files[0]);
            }

            axios.post('/api/aule', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
                .then(() => {
                    alert("Aula creata con successo!");
                    window.location.reload();
                })
                .catch(error => {
                    console.error("Errore creazione aula:", error);
                    alert("Errore durante la creazione dell'aula.");
                });
        } else {
            // --- Logica di AGGIORNAMENTO (PUT) ---
            const aulaId = aulaSelect.value;
            if (!aulaId) return;

            const aulaData = {
                nome: aulaNomeInput.value,
                capienza: parseInt(aulaCapienzaInput.value, 10),
                risorse: aulaRisorseInput.value.split(",").map(r => r.trim()),
                attiva: aulaAttivaCheckbox.checked,
                imageUrl: aulaImageUrlInput.value
            };

            axios.put(`/api/aule/${aulaId}`, aulaData)
                .then(() => {
                    alert("Aula aggiornata con successo!");
                    window.location.reload();
                })
                .catch(error => {
                    console.error("Errore aggiornamento aula:", error);
                    alert(error.response?.data || "Errore durante l'aggiornamento.");
                });
        }
    }

    function cancel() {
        aulaDetailsDiv.style.display = 'none';
        isCreateMode = false;
        aulaSelect.value = "";
    }

    // --- Event Listeners ---
    aulaSelect.addEventListener('change', showEditForm);
    btnNewAula.addEventListener('click', showCreateForm);
    btnSaveAula.addEventListener('click', saveAula);
    btnCancel.addEventListener('click', cancel);

    // Listener per mostrare il nome del file scelto
    aulaImmagineFileInput.onchange = () => {
        if (aulaImmagineFileInput.files.length > 0) {
            fileNameDisplay.textContent = aulaImmagineFileInput.files[0].name;
        } else {
            fileNameDisplay.textContent = "Nessun file selezionato";
        }
    };
});

let prenotazioniCorrenti = [];
/**
 * Carica e visualizza le prenotazioni per una specifica aula in una data selezionata.
 * Questa funzione è il cuore della sezione "Prenotazioni per Aula" nella Dashboard Amministratore.
 * Recupera i dati dal backend e popola dinamicamente una tabella HTML.
 * @returns {void}
 */
function loadPrenotazioni() {
    // Recupero dei parametri di ricerca.
    const aulaId = document.getElementById("aulaSelectPrenotazioni").value; // ID dell'aula selezionata nel dropdown.
    const data = document.getElementById("dataPrenotazione").value;     // Data selezionata nel campo input.

    prenotazioniCorrenti = [];
    const downloadButton = document.getElementById("table-download-button");
    if(downloadButton) downloadButton.disabled = true; // Disabilita il pulsante di download

    // Validazione dei parametri.
    if (!aulaId || !data) {
        alert("Seleziona un'aula e una data!");
        return;
    }

    // Chiamata API al Backend.
    axios.get(`/api/admin/prenotazioni?aulaId=${aulaId}&data=${data}`)
        .then(response => {

            prenotazioniCorrenti = response.data;

            if (response.data.length > 0 && downloadButton) {
                downloadButton.disabled = false;
            } else if (downloadButton) {
                downloadButton.disabled = true; // Disabilitato se non ci sono prenotazioni
            }
            // Preparazione della Tabella HTML.
            const tableBody = document.getElementById("prenotazioniTable"); // Riferimento al corpo della tabella.
            tableBody.innerHTML = ""; // Pulisce completamente il contenuto esistente della tabella.
            // Questo assicura che a ogni nuova ricerca la tabella venga ripopolata da zero.

            // Iterazione e Popolamento Dinamico.
            // Per ogni oggetto 'prenotazione' ricevuto nella risposta dal backend (response.data è un array):
            response.data.forEach(prenotazione => {
                const row = document.createElement("tr"); // Crea una nuova riga HTML (<tr>) per la tabella.

                // Cella Studente (Nome e Cognome).
                const studenteCell = document.createElement("td");
                studenteCell.textContent = `${prenotazione.utente.nome} ${prenotazione.utente.cognome}`;
                row.appendChild(studenteCell);

                // Cella Email Studente.
                const emailCell = document.createElement("td");
                emailCell.textContent = prenotazione.utente.email;
                row.appendChild(emailCell);

                // Cella Orario di Inizio.
                const inizioCell = document.createElement("td");
                // Formatta l'orario di inizio (che arriva come data completa) per mostrare solo ore e minuti.
                inizioCell.textContent = new Date(prenotazione.inizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                row.appendChild(inizioCell);

                // Cella Orario di Fine.
                const fineCell = document.createElement("td");
                // Formatta l'orario di fine.
                fineCell.textContent = new Date(prenotazione.fine).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                row.appendChild(fineCell);

                // Cella Stato della Prenotazione (Attiva/Terminata).
                const statoCell = document.createElement("td");
                const statoTag = document.createElement("span"); // Crea uno span per il tag visivo.
                // 'is-success' (verde) per attiva, 'is-danger' (rosso) per terminata.
                statoTag.className = prenotazione.attiva ? "tag is-success is-light" : "tag is-danger is-light";
                statoTag.innerHTML = prenotazione.attiva
                    ? '<i class="fas fa-check-circle mr-1"></i> Attiva'
                    : '<i class="fas fa-times-circle mr-1"></i> Terminata';
                statoCell.appendChild(statoTag);
                row.appendChild(statoCell);

                // Cella Azioni (Pulsante "Termina").
                const azioniCell = document.createElement("td");
                // Il pulsante "Termina" viene mostrato solo se la prenotazione è ancora attiva.
                if (prenotazione.attiva) {
                    const terminaBtn = document.createElement("button");
                    terminaBtn.className = "button is-small is-warning";
                    terminaBtn.textContent = "Termina";
                    // Collega il click del pulsante alla funzione 'terminaPrenotazioneAdmin' passando l'ID della prenotazione.
                    terminaBtn.onclick = () => terminaPrenotazioneAdmin(prenotazione.id);
                    azioniCell.appendChild(terminaBtn);
                }
                row.appendChild(azioniCell);

                // Cella Recensione (Pulsante "Visualizza recensione").
                const recensioneCell = document.createElement("td");
                // Il pulsante "Visualizza recensione" viene mostrato solo se la prenotazione ha una recensione associata.
                if (prenotazione.recensione) {
                    const btnVisualizzaRecensione = document.createElement("button");
                    btnVisualizzaRecensione.className = "button is-small is-light";
                    btnVisualizzaRecensione.textContent = "Visualizza recensione";
                    // Collega il click del pulsante alla funzione 'apriModalVisualizzazioneRecensione' passando il testo della recensione.
                    btnVisualizzaRecensione.onclick = () => apriModalVisualizzazioneRecensione(prenotazione.recensione);
                    recensioneCell.appendChild(btnVisualizzaRecensione);
                }
                row.appendChild(recensioneCell);

                // Aggiunge la riga completa (<tr> con tutte le <td>) al corpo della tabella HTML.
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            // Gestione degli Errori.
            // In caso di errore durante la richiesta API (es. errore di rete, errore server):
            console.error("Errore caricamento prenotazioni:", error); // Logga l'errore nella console per debugging.
            alert("Errore nel caricamento delle prenotazioni."); // Mostra un messaggio di errore all'utente.
        });
}


/**
 * Termina una prenotazione specifica da parte dell'amministratore.
 * @param {number} idPrenotazione - L'ID della prenotazione da terminare.
 * @fires POST - Invia una richiesta HTTP POST all'endpoint `/api/admin/prenotazioni/{id}/termina`. // MODIFICA QUI: Aggiornato doc
 * @returns {void}
 */
function terminaPrenotazioneAdmin(idPrenotazione) {
    // Chiede conferma all'utente prima di procedere.
    if (!confirm("Sei sicuro di voler terminare questa prenotazione?")) return;

    // Invia la richiesta POST per terminare la prenotazione.
    axios.post(`/api/admin/prenotazioni/${idPrenotazione}/termina`)
        .then(() => {
            // Se la richiesta ha successo, mostra un alert e ricarica le prenotazioni per aggiornare la tabella.
            alert("Prenotazione terminata con successo.");
            loadPrenotazioni(); // Ricarica la tabella per mostrare lo stato aggiornato della prenotazione.
        })
        .catch(err => {
            // In caso di errore, logga l'errore e mostra un alert.
            console.error("Errore nella terminazione:", err);
            alert("Errore durante la terminazione della prenotazione.");
        });
}

/**
 * Rende visibile una modale (finestra di dialogo) aggiungendo la classe 'is-active' al suo elemento.
 * @param {string} idModal - L'ID dell'elemento HTML della modale da aprire.
 * @returns {void}
 */
function apriModale(idModal) {
    document.getElementById(idModal).classList.add("is-active");
}

/**
 * Nasconde una modale (finestra di dialogo) rimuovendo la classe 'is-active' dal suo elemento.
 * @param {string} idModal - L'ID dell'elemento HTML della modale da chiudere.
 * @returns {void}
 */
function chiudiModale(idModal) {
    document.getElementById(idModal).classList.remove("is-active");
}

/**
 * Apre la modale per visualizzare una recensione e ne imposta il contenuto nella textarea.
 * @param {string} testoRecensione - Il testo della recensione da mostrare nella modale.
 * @returns {void}
 */
function apriModalVisualizzazioneRecensione(testoRecensione) {
    // Imposta il valore della textarea all'interno della modale con il testo della recensione.
    document.getElementById("textareaVisualizzazioneRecensione").value = testoRecensione;
    // Apre la modale di visualizzazione.
    apriModale("modal-visualizza-recensione");
}

//Event listener per i pulsanti di chiusura della modale di visualizzazione recensione.
// Questo blocco assicura che gli handler vengano attaccati solo quando il DOM è completamente pronto.
document.addEventListener("DOMContentLoaded", () => {
    const modalVisualizzazione = document.getElementById("modal-visualizza-recensione");
    if (modalVisualizzazione) {
        // Aggiunge un listener al pulsante 'x' (delete) per chiudere la modale.
        document.getElementById("closeModalVisualizzazione").addEventListener("click", () => chiudiModale("modal-visualizza-recensione"));
        // Aggiunge un listener al pulsante "Chiudi" per chiudere la modale.
        document.getElementById("cancelModalVisualizzazione").addEventListener("click", () => chiudiModale("modal-visualizza-recensione"));
    }
});
