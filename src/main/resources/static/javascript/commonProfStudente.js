/**
 * /javascript/commonProfStudente.js
 * Libreria condivisa per le funzionalità comuni tra professori e studenti.
 * Contiene funzioni di utilità e il componente di prenotazione interattivo
 * che gestisce la selezione e prenotazione delle aule.
 */

// --- STATO GLOBALE COMUNE ---
/**
 * Memorizza l'ID della prenotazione che l'utente sta per terminare.
 * Utilizzato dai modali di conferma per terminare le prenotazioni.
 */
let prenotazioneDaTerminareId = null;

/**
 * Impostazione del token CSRF per tutte le richieste Axios
 * Questo è necessario per proteggere le richieste POST, PUT, DELETE da attacchi CSRF
 * Recupera il token dai meta tag inseriti da Spring Security
 */
const csrfMeta = document.querySelector('meta[name="_csrf"]');
if (csrfMeta) {
    axios.defaults.headers.common[document.querySelector('meta[name="_csrf_header"]').content] = csrfMeta.content;
}


// --- FUNZIONI DI UTILITÀ ---
/**
 * Mostra una notifica all'utente con un messaggio specifico.
 * La notifica scompare automaticamente dopo 5 secondi o può essere chiusa manualmente.
 * 
 * @param {string} message - Il messaggio da mostrare nella notifica
 * @param {boolean} isSuccess - Se true, la notifica sarà verde (successo), altrimenti rossa (errore)
 */
function showNotification(message, isSuccess = true) {
    const container = document.querySelector('.section .container');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${isSuccess ? 'is-success' : 'is-danger'} is-light`;
    notification.innerHTML = `<button class="delete"></button>${message}`;
    container.prepend(notification);
    notification.querySelector('.delete').addEventListener('click', () => notification.remove());
    setTimeout(() => notification.remove(), 5000);
}

/**
 * Formatta un oggetto Date nel formato YYYY-MM-DD richiesto dagli input HTML di tipo date.
 * 
 * @param {Date} date - L'oggetto Date da formattare
 * @returns {string} La data formattata come stringa YYYY-MM-DD
 */
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Converte un oggetto Date in una stringa standard ISO 8601 in formato UTC.
 * Utilizzato per inviare date al backend in un formato standard.
 * Esempio: "2025-07-04T14:30:00.000Z"
 * 
 * @param {Date} dateObject - L'oggetto Date da convertire
 * @returns {string} La stringa in formato ISO
 */
function formatDateTimeForAPI(dateObject) {
    return dateObject.toISOString();
}


// --- FUNZIONI PER MODALI (USATE DALLA LISTA "LE MIE PRENOTAZIONI") ---
/**
 * Apre un modale identificato dall'ID e opzionalmente imposta l'ID della prenotazione da terminare.
 * 
 * @param {string} modalId - L'ID dell'elemento HTML del modale da aprire
 * @param {number|null} id - L'ID della prenotazione (usato solo per il modale di terminazione)
 */
function apriModal(modalId, id = null) {
    const modal = document.getElementById(modalId);
    if(modalId === 'modal-termina-prenotazione') {
        prenotazioneDaTerminareId = id;
    }
    if (modal) modal.classList.add('is-active');
}

/**
 * Chiude un modale identificato dall'ID e resetta l'ID della prenotazione se necessario.
 * 
 * @param {string} modalId - L'ID dell'elemento HTML del modale da chiudere
 */
function chiudiModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('is-active');
    if(modalId === 'modal-termina-prenotazione') {
        prenotazioneDaTerminareId = null;
    }
}

/**
 * Configura gli elementi di chiusura all'interno di un modale.
 * Aggiunge event listener ai pulsanti di chiusura, allo sfondo e ai pulsanti non-azione.
 * 
 * @param {string} modalId - L'ID dell'elemento HTML del modale da configurare
 */
function setupModalClosers(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.querySelectorAll('.delete, .modal-background, .modal-card-foot .button:not(.is-danger):not(.is-success)').forEach(el => {
        el.addEventListener('click', () => chiudiModal(modalId));
    });
}


// --- COMPONENTE DI PRENOTAZIONE INTERATTIVO ---

/**
 * Inizializza il componente di prenotazione interattivo.
 * Questo componente gestisce l'interfaccia utente per la selezione e prenotazione delle aule,
 * mostrando la disponibilità per data e aula selezionate e permettendo la selezione di slot orari.
 * 
 * @param {object} config - Oggetto di configurazione specifico per la pagina
 * @param {string} config.dataInputId - ID dell'input per la selezione della data
 * @param {string} config.aulaSelectId - ID del select per la scelta dell'aula
 * @param {string} config.gridId - ID del container per la griglia di disponibilità
 * @param {string} config.summaryId - ID del container per il riepilogo della prenotazione
 * @param {string} config.confirmBtnId - ID del pulsante di conferma prenotazione
 * @param {string} config.apiEndpoint - Endpoint API per effettuare la prenotazione
 * @param {number} config.maxDurationSlots - Numero massimo di slot prenotabili consecutivamente
 * @param {Function} config.setupDatePicker - Funzione per configurare il selettore di date
 */
function inizializzaBookingInterattivo(config) {
    const dataInput = document.getElementById(config.dataInputId);
    const aulaSelect = document.getElementById(config.aulaSelectId);
    const disponibilitaGrid = document.getElementById(config.gridId);
    const bookingSummary = document.getElementById(config.summaryId);
    const confermaBtn = document.getElementById(config.confirmBtnId);
    const resetBtn = document.getElementById('reset-selection-btn');

    // Variabili di stato per la selezione corrente
    let selezioneInizioIndex = null;  // Indice dello slot di inizio selezionato
    let selezioneFineTime = null;     // Orario di fine della prenotazione
    let allSlots = [];                // Tutti gli slot disponibili per la data/aula selezionata

    /**
     * Carica la disponibilità dell'aula per la data selezionata.
     * Effettua una chiamata API per ottenere gli slot disponibili e li filtra
     * in base alla data corrente (se la data selezionata è oggi).
     */
    async function loadDisponibilita() {
        resetSelezione();
        const data = dataInput.value;
        const aulaId = aulaSelect.value;
        if (!data || !aulaId) {
            disponibilitaGrid.innerHTML = '<p class="has-text-grey column is-full">Seleziona una data e un\'aula.</p>';
            return;
        }
        try {
            const response = await axios.get(`/api/aule/${aulaId}/disponibilita`, { params: { data } });
            let fetchedSlots = response.data;
            const oggi = new Date();
            // Aggiungiamo T00:00:00 per evitare problemi di fuso orario nel confronto
            const dataSelezionata = new Date(data + 'T00:00:00');

            // Confrontiamo solo la parte della data (giorno, mese, anno)
            if (dataSelezionata.toDateString() === oggi.toDateString()) {
                // Se è oggi, teniamo solo gli slot il cui inizio è dopo l'ora attuale.
                const adesso = new Date();
                allSlots = fetchedSlots.filter(slot => new Date(slot.inizio) > adesso);
            } else {
                // Se è un giorno futuro, usiamo tutti gli slot ricevuti.
                allSlots = fetchedSlots;
            }

            renderDisponibilita(allSlots);
        } catch (error) {
            showNotification('Errore nel caricamento della disponibilità.', false);
        }
    }

    /**
     * Renderizza la griglia di disponibilità con gli slot orari.
     * Crea elementi HTML per ogni slot, colorandoli in base alla disponibilità
     * e aggiungendo event listener per la selezione.
     * 
     * @param {Array} slots - Array di oggetti slot con informazioni sulla disponibilità
     */
    function renderDisponibilita(slots) {
        disponibilitaGrid.innerHTML = '';
        if (slots.length === 0) {
            disponibilitaGrid.innerHTML = '<p class="has-text-grey column is-full">Nessuno slot disponibile.</p>';
            return;
        }
        slots.forEach((slot, index) => {
            const col = document.createElement("div");
            col.className = "column is-one-fifth";
            const available = slot.liberi > 0;
            const inizioTime = new Date(slot.inizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const fineTime = new Date(slot.fine).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const box = document.createElement("div");

            // Stile diverso per slot disponibili e non disponibili
            box.className = `box p-2 has-text-centered dispo-tile ${available ? 'has-background-success-light has-text-black is-clickable' : 'has-background-danger-light has-text-black'}`;

            box.dataset.index = index;
            box.innerHTML = `<p class="time has-text-weight-semibold">${inizioTime} – ${fineTime}</p><p class="count is-size-7">${available ? `<span>${slot.liberi} posti</span>` : `<span>Pieno</span>`}</p>`;
            if (available) {
                box.addEventListener('click', handleSlotClick);
            }
            col.appendChild(box);
            disponibilitaGrid.appendChild(col);
        });
    }

    /**
     * Gestisce il click su uno slot orario nella griglia di disponibilità.
     * Implementa la logica di selezione dell'intervallo di prenotazione:
     * - Se nessuno slot è selezionato o si clicca prima dell'inizio attuale, imposta l'inizio
     * - Se si clicca dopo l'inizio attuale, tenta di selezionare l'intervallo fino allo slot cliccato
     * 
     * @param {Event} event - L'evento di click
     */
    function handleSlotClick(event) {
        const clickedBox = event.currentTarget;
        const clickedIndex = parseInt(clickedBox.dataset.index, 10);

        if (selezioneInizioIndex === null || clickedIndex < selezioneInizioIndex) {
            // Primo click o click prima dell'inizio attuale: imposta nuovo inizio
            selezioneInizioIndex = clickedIndex;
            updateSelezioneUI();
        } else {
            // Click dopo l'inizio: tenta di selezionare l'intervallo
            const fineProvvisoria = clickedIndex;

            // Verifica che tutti gli slot nell'intervallo siano disponibili
            let isValidRange = true;
            for (let i = selezioneInizioIndex; i <= fineProvvisoria; i++) {
                if (!allSlots[i] || allSlots[i].liberi === 0) {
                    isValidRange = false;
                    break;
                }
            }

            // Verifica che la durata non superi il massimo consentito
            const durationInSlots = fineProvvisoria - selezioneInizioIndex + 1;
            if (durationInSlots > config.maxDurationSlots) {
                showNotification(`La durata massima della prenotazione è di ${config.maxDurationSlots / 2} ore.`, false);
                resetSelezione();
                return;
            }

            if (isValidRange) {
                updateSelezioneUI(fineProvvisoria);
            } else {
                showNotification('L\'intervallo selezionato contiene orari non disponibili.', false);
                resetSelezione();
            }
        }
    }

    /**
     * Aggiorna l'interfaccia utente per riflettere la selezione corrente.
     * Evidenzia gli slot selezionati, mostra suggerimenti per la selezione
     * e aggiorna il riepilogo della prenotazione.
     * * @param {number|null} fineIndex - Indice dello slot finale selezionato, o null se è selezionato solo l'inizio
     */
    function updateSelezioneUI(fineIndex = null) {
        const fineReale = fineIndex === null ? selezioneInizioIndex : fineIndex;

        // 1. Pulisci tutti gli stili precedenti
        disponibilitaGrid.querySelectorAll('.dispo-tile').forEach(box => {
            box.classList.remove('has-background-link', 'has-text-white', 'has-text-link', 'has-text-black');
        });

        // 2. Evidenzia l'intervallo SELEZIONATO
        for (let i = selezioneInizioIndex; i <= fineReale; i++) {
            disponibilitaGrid.querySelector(`[data-index='${i}']`)?.classList.add('has-background-link', 'has-text-white');
        }

        // 3. Se è stato selezionato solo l'inizio, mostra i suggerimenti
        if (fineIndex === null) {
            const limiteMax = selezioneInizioIndex + config.maxDurationSlots;
            for (let i = selezioneInizioIndex + 1; i < limiteMax; i++) {
                if (!allSlots[i] || allSlots[i].liberi === 0) {
                    break;
                }
                disponibilitaGrid.querySelector(`[data-index='${i}']`)?.classList.add('has-text-link');
            }
        }

        // 4. Aggiorna il riepilogo della prenotazione
        const startSlot = allSlots[selezioneInizioIndex];
        const endSlot = allSlots[fineReale];
        selezioneFineTime = endSlot.fine;
        document.getElementById('summary-aula').textContent = aulaSelect.options[aulaSelect.selectedIndex].text;
        document.getElementById('summary-data').textContent = new Date(dataInput.value + 'T00:00:00').toLocaleDateString('it-IT');
        document.getElementById('summary-orario').textContent = `${new Date(startSlot.inizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(endSlot.fine).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        // 5. Mostra il riepilogo e il pulsante di reset
        bookingSummary.style.display = 'block';
        resetBtn.style.display = 'inline-block';
    }

    /**
     * Resetta la selezione corrente, nascondendo il riepilogo e rimuovendo
     * tutti gli stili di selezione dalla griglia.
     */
    function resetSelezione() {
        selezioneInizioIndex = null;
        selezioneFineTime = null;

        bookingSummary.style.display = 'none';
        resetBtn.style.display = 'none';

        // Rimuovi stili di selezione
        disponibilitaGrid.querySelectorAll('.dispo-tile').forEach(box => {
            box.classList.remove('has-background-link', 'has-text-white', 'has-text-link', 'has-text-black');        });
    }

    /**
     * Effettua la prenotazione dell'aula per l'intervallo selezionato.
     * Invia i dati al server tramite API e gestisce la risposta.
     */
    async function prenota() {
        // Verifica che tutti i dati necessari siano presenti
        if (!dataInput.value || !aulaSelect.value || selezioneInizioIndex === null || !selezioneFineTime) {
            showNotification("Selezione non valida. Completa tutti i passaggi.", false);
            return;
        }

        // Prepara i dati della prenotazione con oggetti Date
        const inizioDate = new Date(allSlots[selezioneInizioIndex].inizio);
        const fineDate = new Date(selezioneFineTime);

        const prenotazioneData = {
            aulaId: aulaSelect.value,
            inizio: formatDateTimeForAPI(inizioDate),
            fine: formatDateTimeForAPI(fineDate)
        };

        try {
            // Invia la richiesta di prenotazione
            const response = await axios.post(config.apiEndpoint, prenotazioneData);
            showNotification(response.data, true);

            // Reset e aggiornamento UI
            resetSelezione();
            loadDisponibilita();

            // Aggiorna la lista delle prenotazioni se disponibile
            if (typeof window.loadMiePrenotazioni === 'function') {
                window.loadMiePrenotazioni(true);
            }
        } catch (error) {
            showNotification(error.response?.data || "Errore durante la prenotazione.", false);
        }
    }

    // Inizializzazione del componente

    // Configura il selettore di date in base alle regole specifiche (studente o professore)
    config.setupDatePicker(dataInput);

    // Configura gli event listener per gli elementi interattivi
    dataInput.addEventListener('change', loadDisponibilita);
    aulaSelect.addEventListener('change', loadDisponibilita);
    confermaBtn.addEventListener('click', prenota);
    resetBtn.addEventListener('click', resetSelezione);

    // Carica la disponibilità iniziale se è già selezionata un'aula
    if (aulaSelect.value) {
        loadDisponibilita();
    }
}
