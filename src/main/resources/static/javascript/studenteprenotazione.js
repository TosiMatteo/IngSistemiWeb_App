/**
 * /javascript/studenteprenotazione.js
 * Logica specifica per la dashboard dello studente.
 * Gestisce la prenotazione delle aule e la visualizzazione delle prenotazioni esistenti.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. CONFIGURAZIONE PRENOTAZIONE INTERATTIVA ---
    /**
     * Configurazione specifica per la prenotazione da parte degli studenti.
     * Gli studenti possono prenotare solo per oggi o domani, con una durata massima di 4 ore.
     */
    const configStudente = {
        dataInputId: 'data-prenotazione-input',
        aulaSelectId: 'aula-prenotazione-select',
        gridId: 'disponibilita-grid-interattiva',
        summaryId: 'booking-summary',
        confirmBtnId: 'conferma-prenotazione-btn',
        apiEndpoint: '/api/studente/prenotazioni',
        maxDurationSlots: 8, // 4 ore = 8 slot da 30 min
        /**
         * Configura il selettore di date per gli studenti:
         * - Data minima: oggi
         * - Data massima: domani
         * - Valore predefinito: oggi
         * 
         * @param {HTMLInputElement} datePicker - L'elemento input di tipo date da configurare
         */
        setupDatePicker: (datePicker) => {
            const today = new Date();
            datePicker.min = formatDateForInput(today);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            datePicker.max = formatDateForInput(tomorrow);
            datePicker.value = formatDateForInput(today);
        }
    };

    // Inizializza il componente comune con la configurazione dello studente
    inizializzaBookingInterattivo(configStudente);


    // --- 2. LOGICA PER LA LISTA "LE MIE PRENOTAZIONI" ---
    /**
     * Elementi DOM per la gestione della lista delle prenotazioni
     */
    const prenotazioniTableBody = document.getElementById("prenotazioniStudenteTable");
    const filtriBtnContainer = document.getElementById('filtri-prenotazioni');
    const mostraDiPiuBtn = document.getElementById('mostra-di-piu-btn');
    const confermaAnnullamentoBtn = document.getElementById('confermaAnnullamentoStudenteBtn');
    const inviaRecensioneBtn = document.getElementById("inviaRecensioneBtn");

    /**
     * Variabili di stato per la paginazione e il filtraggio delle prenotazioni
     */
    let paginaCorrente = 0;          // Pagina corrente per la paginazione
    let filtroCorrente = 'tutte';    // Filtro attivo (tutte, attive, terminate)
    let isLastPage = false;          // Flag per indicare se siamo all'ultima pagina
    const PRENOTAZIONI_PER_PAGINA = 8; // Numero di prenotazioni da visualizzare per pagina
    let idPrenotazioneRecensione = null; // ID della prenotazione per cui si sta scrivendo una recensione

    /**
     * Carica le prenotazioni dello studente dal server.
     * Supporta la paginazione e il filtraggio per stato.
     * 
     * @param {boolean} reset - Se true, resetta la paginazione e ricarica dalla prima pagina
     */
    async function loadPrenotazioni(reset = false) {
        // Reset della paginazione se richiesto
        if (reset) {
            paginaCorrente = 0;
            isLastPage = false;
        }
        // Non caricare altre pagine se siamo già all'ultima
        if (isLastPage && !reset) return;

        try {
            // Richiesta API con parametri di paginazione e filtro
            const response = await axios.get('/api/studente/prenotazioni', {
                params: { 
                    stato: filtroCorrente, 
                    page: paginaCorrente, 
                    size: PRENOTAZIONI_PER_PAGINA, 
                    sort: 'inizio,desc' // Ordina per data di inizio decrescente
                }
            });
            const page = response.data;
            renderPrenotazioni(page.content, reset);
            isLastPage = page.last;
            // Nascondi il pulsante "Mostra di più" se siamo all'ultima pagina
            mostraDiPiuBtn.classList.toggle('is-hidden', isLastPage);
        } catch (error) {
            showNotification("Errore nel caricamento delle tue prenotazioni.", false);
        }
    }
    // Esponi la funzione globalmente per permettere l'aggiornamento dopo una nuova prenotazione
    window.loadMiePrenotazioni = loadPrenotazioni;

    /**
     * Renderizza le prenotazioni nella tabella.
     * Gestisce diversi stati delle prenotazioni (attiva, check-in effettuato, terminata)
     * e mostra pulsanti di azione appropriati in base allo stato.
     * 
     * @param {Array} prenotazioni - Array di oggetti prenotazione da visualizzare
     * @param {boolean} reset - Se true, svuota la tabella prima di aggiungere le nuove righe
     */
    function renderPrenotazioni(prenotazioni, reset) {
        // Se reset è true, svuota la tabella
        if (reset) prenotazioniTableBody.innerHTML = '';

        // Mostra messaggio se non ci sono prenotazioni
        if (prenotazioni.length === 0 && reset) {
            prenotazioniTableBody.innerHTML = '<tr><td colspan="7" class="has-text-grey">Nessuna prenotazione trovata.</td></tr>';
            return;
        }

        const rowsHtml = prenotazioni.map(p => {
            const adesso = new Date();
            const inizioPrenotazione = new Date(p.inizio);
            // La finestra di check-in è di 15 minuti dall'inizio della prenotazione
            const fineFinestraCheckIn = new Date(inizioPrenotazione.getTime() + 15 * 60 * 1000);
            let statoHtml, azioniHtml = '', reviewButtonHtml = '';

            // Gestione prenotazioni attive
            if (p.attiva) {
                // Determinazione dello stato visivo
                if (p.checkedIn) statoHtml = '<span class="tag is-success">Check-in Effettuato</span>';
                else if (adesso > fineFinestraCheckIn) statoHtml = '<span class="tag is-danger">Mancato Check-in</span>';
                else statoHtml = '<span class="tag is-warning">Attiva</span>';

                // Determinazione delle azioni disponibili
                if (!p.checkedIn && adesso < inizioPrenotazione) 
                    // Prima dell'inizio: possibilità di terminare
                    azioniHtml = `<button class="button is-small is-danger" onclick="apriModal('modal-termina-prenotazione', ${p.id})">Termina</button>`;
                else if (!p.checkedIn && adesso >= inizioPrenotazione && adesso <= fineFinestraCheckIn) 
                    // Durante la finestra di check-in: possibilità di fare check-in
                    azioniHtml = `<button class="button is-small is-primary" onclick="effettuaCheckIn(${p.id})">Check-in</button>`;
                else if (p.checkedIn) 
                    // Dopo check-in: possibilità di terminare
                    azioniHtml = `<button class="button is-small is-warning" onclick="apriModal('modal-termina-prenotazione', ${p.id})">Termina</button>`;
            } 
            // Gestione prenotazioni terminate
            else {
                statoHtml = '<span class="tag">Terminata</span>';
                // Gestione recensioni
                if (p.recensione) 
                    // Se c'è già una recensione, mostra pulsante per visualizzarla
                    reviewButtonHtml = `<button class="button is-small is-light" onclick="openVisualizzazioneRecensione('${p.recensione.replace(/'/g, "\\'")}')">Visualizza</button>`;
                else 
                    // Altrimenti, mostra pulsante per aggiungere recensione
                    reviewButtonHtml = `<button class="button is-small is-info" onclick="apriModalRecensione(${p.id})">Recensisci</button>`;
            }

            // Costruzione della riga HTML
            return `
                <tr>
                    <td>${p.aula.nome}</td>
                    <td>${inizioPrenotazione.toLocaleDateString('it-IT')}</td>
                    <td>${inizioPrenotazione.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${new Date(p.fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${statoHtml}</td><td>${azioniHtml}</td><td>${reviewButtonHtml}</td>
                </tr>
            `;
        }).join('');

        // Aggiungi le righe alla tabella
        prenotazioniTableBody.innerHTML += rowsHtml;
    }

    /**
     * Effettua il check-in per una prenotazione.
     * Questa funzione è esposta globalmente per essere chiamata dai pulsanti nella tabella.
     * 
     * @param {number} prenotazioneId - ID della prenotazione per cui effettuare il check-in
     */
    window.effettuaCheckIn = async (prenotazioneId) => {
        try {
            await axios.post(`/api/studente/prenotazioni/${prenotazioneId}/check-in`);
            showNotification('Check-in effettuato con successo!', true);
            loadPrenotazioni(true); // Ricarica la lista per mostrare lo stato aggiornato
        } catch (error) {
            showNotification(error.response?.data || "Errore durante il check-in.", false);
        }
    };

    /**
     * Termina una prenotazione attiva.
     * Utilizza l'ID memorizzato in prenotazioneDaTerminareId, impostato quando si apre il modale di conferma.
     */
    async function terminaPrenotazione() {
        if (!prenotazioneDaTerminareId) return;
        try {
            await axios.post(`/api/studente/prenotazioni/${prenotazioneDaTerminareId}/termina`);
            showNotification('Prenotazione terminata con successo.', true);
            chiudiModal('modal-termina-prenotazione');
            loadPrenotazioni(true); // Ricarica la lista per mostrare lo stato aggiornato
        } catch (error) {
            showNotification(error.response?.data || "Errore durante la terminazione.", false);
        }
    }

    /**
     * Apre il modale per inserire una recensione per un'aula.
     * Questa funzione è esposta globalmente per essere chiamata dai pulsanti nella tabella.
     * 
     * @param {number} id - ID della prenotazione per cui inserire la recensione
     */
    window.apriModalRecensione = (id) => {
        idPrenotazioneRecensione = id; // Memorizza l'ID per l'invio successivo
        document.getElementById("recensioneTextarea").value = ''; // Pulisce il campo
        apriModal('modal-recensione');
    };

    /**
     * Apre il modale per visualizzare una recensione esistente.
     * Questa funzione è esposta globalmente per essere chiamata dai pulsanti nella tabella.
     * 
     * @param {string} testo - Testo della recensione da visualizzare
     */
    window.openVisualizzazioneRecensione = (testo) => {
        document.getElementById("textareaVisualizzazioneRecensione").value = testo;
        apriModal('modal-visualizza-recensione');
    };

    /**
     * Gestisce l'invio di una nuova recensione.
     * Invia il testo della recensione al server e aggiorna la lista delle prenotazioni.
     */
    inviaRecensioneBtn.addEventListener('click', async () => {
        const testo = document.getElementById("recensioneTextarea").value.trim();
        // Validazione: il testo non può essere vuoto
        if (!testo) { 
            showNotification("Inserisci un testo per la recensione.", false); 
            return; 
        }

        try {
            // Invia la recensione come testo semplice
            await axios.post(
                `/api/studente/prenotazioni/${idPrenotazioneRecensione}/recensione`, 
                testo, 
                { headers: { 'Content-Type': 'text/plain' } }
            );
            showNotification("Recensione inviata con successo!", true);
            chiudiModal("modal-recensione");
            loadPrenotazioni(true); // Ricarica la lista per mostrare la recensione
        } catch (error) {
            showNotification(error.response?.data || "Errore nell'invio della recensione.", false);
        }
    });

    /**
     * Gestisce il click sui pulsanti di filtro delle prenotazioni.
     * Cambia il filtro attivo e ricarica la lista delle prenotazioni.
     */
    filtriBtnContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            // Aggiorna lo stile del pulsante attivo
            filtriBtnContainer.querySelector('.is-link')?.classList.remove('is-link');
            event.target.classList.add('is-link');

            // Imposta il nuovo filtro e ricarica le prenotazioni
            filtroCorrente = event.target.dataset.filtro;
            loadPrenotazioni(true);
        }
    });

    /**
     * Gestisce il click sul pulsante "Mostra di più".
     * Incrementa la pagina corrente e carica la pagina successiva di prenotazioni.
     */
    mostraDiPiuBtn.addEventListener('click', () => {
        paginaCorrente++;
        loadPrenotazioni(false); // false = non resettare, aggiungere alla lista esistente
    });

    /**
     * Collega il pulsante di conferma annullamento all'azione di terminazione.
     */
    confermaAnnullamentoBtn.addEventListener('click', terminaPrenotazione);

    // Inizializzazione dei modali
    setupModalClosers('modal-termina-prenotazione');
    setupModalClosers('modal-recensione');
    setupModalClosers('modal-visualizza-recensione');

    // Carica la lista iniziale delle prenotazioni
    loadPrenotazioni(true);
});
