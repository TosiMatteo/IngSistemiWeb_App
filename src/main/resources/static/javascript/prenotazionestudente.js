/**
 * Script per la dashboard dello studente.
 * Questo file contiene la logica specifica per la pagina dello studente
 * e dipende da 'common.js', che deve essere caricato prima.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- RIFERIMENTI AGLI ELEMENTI DEL DOM ---
    const dataPrenotazioneInput = document.getElementById("dataPrenotazioneStudente");
    const inizioSelect = document.getElementById("orarioInizioPrenotazioneStudente");
    const fineSelect = document.getElementById("orarioFinePrenotazioneStudente");
    const aulaSelect = document.getElementById("aulaSelectStudente");
    const prenotazioniTableBody = document.getElementById("prenotazioniStudenteTable");
    const filtriBtnContainer = document.getElementById('filtri-prenotazioni');
    const mostraDiPiuBtn = document.getElementById('mostra-di-piu-btn');

    const confermaAnnullamentoBtn = document.getElementById('confermaAnnullamentoStudenteBtn');
    const inviaRecensioneBtn = document.getElementById("inviaRecensioneBtn");
    const recensioneTextarea = document.getElementById("recensioneTextarea");
    const textareaVisualizzazione = document.getElementById("textareaVisualizzazioneRecensione");



    // --- STATO PER GESTIRE FILTRI E PAGINAZIONE ---
    let tutteLePrenotazioniCaricate = [];
    let paginaCorrente = 0;
    let filtroCorrente = 'tutte'; // Valore di default
    let isLastPage = false;
    const PRENOTAZIONI_PER_PAGINA = 8;

    // Stato specifico per la recensione
    let idPrenotazioneRecensione = null;

    // --- FUNZIONI SPECIFICHE DELLA PAGINA STUDENTE ---

    async function prenotaAula() {
        const data = dataPrenotazioneInput.value;
        const oraInizio = inizioSelect.value;
        const oraFine = fineSelect.value;
        const aulaId = aulaSelect.value;

        if (!data || !oraInizio || !oraFine || !aulaId) {
            showNotification("Per favore, completa tutti i campi per la prenotazione.", false);
            return;
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const selectedDate = new Date(data);
        selectedDate.setHours(0, 0, 0, 0);
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        if (selectedDate.getTime() < now.getTime() || selectedDate.getTime() > tomorrow.getTime()) {
            showNotification('Le prenotazioni possono essere effettuate solo per oggi o domani.', false);
            return;
        }

        const prenotazioneData = {
            aulaId: aulaId,
            inizio: formatDateTimeForAPI(data, oraInizio),
            fine: formatDateTimeForAPI(data, oraFine)
        };

        try {
            const response = await axios.post('/api/studente/prenotazioni', prenotazioneData);
            showNotification(response.data, true);
            loadPrenotazioni();
            // Assumo che loadDisponibilita() esista se necessario
            // loadDisponibilita();

            dataPrenotazioneInput.value = '';
            inizioSelect.value = '';
            fineSelect.value = '';
            aulaSelect.value = '';
            populateOrarioFine(inizioSelect, fineSelect);
        } catch (error) {
            const errorMsg = error.response?.data || "Errore durante la prenotazione. Riprova più tardi.";
            showNotification(errorMsg, false);
        }
    }

    /**
     * Carica le prenotazioni con paginazione e filtri.
     * @param {boolean} reset - Se true, pulisce la tabella e resetta la paginazione (usato quando si cambia filtro).
     */
    async function loadPrenotazioni(reset = false) {
        if (reset) {
            paginaCorrente = 0;
            isLastPage = false;
            tutteLePrenotazioniCaricate = [];
            prenotazioniTableBody.innerHTML = '';
        }

        if (isLastPage) return; // Non carica altro se siamo già all'ultima pagina

        try {
            const response = await axios.get('/api/studente/prenotazioni', {
                params: {
                    stato: filtroCorrente,
                    page: paginaCorrente,
                    size: PRENOTAZIONI_PER_PAGINA
                }
            });

            const page = response.data;
            tutteLePrenotazioniCaricate.push(...page.content);
            isLastPage = page.last;

            renderPrenotazioni(tutteLePrenotazioniCaricate);

            // Gestisce la visibilità del pulsante "Mostra di più"
            if (isLastPage) {
                mostraDiPiuBtn.classList.add('is-hidden');
            } else {
                mostraDiPiuBtn.classList.remove('is-hidden');
            }

        } catch (error) {
            showNotification("Errore nel caricamento delle tue prenotazioni.", false);
        }
    }

    function renderPrenotazioni(prenotazioni) {
        prenotazioniTableBody.innerHTML = '';
        if (prenotazioni.length === 0) {
            prenotazioniTableBody.innerHTML = '<tr><td colspan="7" class="has-text-grey">Nessuna prenotazione trovata.</td></tr>';
            return;
        }

        prenotazioni.forEach(p => {
            const row = document.createElement("tr");
            const adesso = new Date();
            const inizioPrenotazione = new Date(p.inizio);
            const fineFinestraCheckIn = new Date(inizioPrenotazione.getTime() + 15 * 60 * 1000);

            // --- Logica di rendering per STATO ---
            let statoHtml;
            if (p.attiva) {
                if (p.checkedIn) {
                    statoHtml = '<span class="tag is-success">Check-in Effettuato</span>';
                } else if (adesso > fineFinestraCheckIn) {
                    statoHtml = '<span class="tag is-danger">Mancato Check-in</span>';
                } else {
                    statoHtml = '<span class="tag is-warning">Attiva</span>';
                }
            } else {
                statoHtml = '<span class="tag">Terminata</span>';
            }

            let azioniHtml = '';
            if (p.attiva) {
                if (!p.checkedIn) {
                    if (adesso < inizioPrenotazione) {
                        azioniHtml = `<button class="button is-small is-danger" onclick="apriModal('modal-termina-prenotazione', ${p.id})">Termina</button>`;
                    } else if (adesso >= inizioPrenotazione && adesso <= fineFinestraCheckIn) {
                        azioniHtml = `<button class="button is-small is-primary" onclick="effettuaCheckIn(${p.id})">Check-in</button>`;
                    }
                } else {
                    azioniHtml = `<button class="button is-small is-warning" onclick="apriModal('modal-termina-prenotazione', ${p.id})">Termina</button>`;
                }
            }

            const reviewButtonHtml = !p.attiva ?
                (p.recensione ?
                    `<button class="button is-small is-light" onclick="openVisualizzazioneRecensione('${p.recensione.replace(/'/g, "\\'")}')">Visualizza</button>` :
                    `<button class="button is-small is-info" onclick="apriModalRecensione(${p.id})">Recensisci</button>`) :
                '';

            row.innerHTML = `
                <td>${p.aula.nome}</td>
                <td>${inizioPrenotazione.toLocaleDateString('it-IT')}</td>
                <td>${inizioPrenotazione.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${new Date(p.fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${statoHtml}</td>
                <td>${azioniHtml}</td>
                <td>${reviewButtonHtml}</td>
            `;
            prenotazioniTableBody.appendChild(row);
        });
    }

    async function effettuaCheckIn(prenotazioneId) {
        try {
            const response = await axios.post(`/api/studente/prenotazioni/${prenotazioneId}/check-in`);
            showNotification(response.data, true);
            loadPrenotazioni();
        } catch (error) {
            showNotification(error.response?.data || "Errore durante il check-in.", false);
        }
    }
    window.effettuaCheckIn = effettuaCheckIn;

    async function terminaPrenotazione() {
        if (!prenotazioneDaTerminareId) return;
        try {
            const response = await axios.post(`/api/studente/prenotazioni/${prenotazioneDaTerminareId}/termina`);
            showNotification(response.data, true);
            // <-- CORREZIONE 3: Usato l'ID corretto 'modal-termina-prenotazione' per chiudere la modale.
            chiudiModal('modal-termina-prenotazione');
            loadPrenotazioni();
        } catch (error) {
            showNotification(error.response?.data || "Errore durante la terminazione.", false);
        }
    }

    function apriModalRecensione(id) {
        idPrenotazioneRecensione = id;
        recensioneTextarea.value = '';
        apriModal('modal-recensione');
    }
    window.apriModalRecensione = apriModalRecensione;

    function openVisualizzazioneRecensione(testo) {
        textareaVisualizzazione.value = testo;
        apriModal('modal-visualizza-recensione');
    }
    window.openVisualizzazioneRecensione = openVisualizzazioneRecensione;

    async function inviaRecensione() {
        const testo = recensioneTextarea.value.trim();
        if (!testo) {
            showNotification("Inserisci un testo per la recensione.", false);
            return;
        }
        try {
            await axios.post(`/api/studente/prenotazioni/${idPrenotazioneRecensione}/recensione`, testo, {
                headers: { 'Content-Type': 'text/plain' }
            });
            showNotification("Recensione inviata con successo!", true);
            chiudiModal("modal-recensione");
            loadPrenotazioni();
        } catch (error) {
            showNotification(error.response?.data || "Errore nell'invio della recensione.", false);
        }
    }

    // --- INIZIALIZZAZIONE DELLA PAGINA ---
    const today = new Date();
    dataPrenotazioneInput.min = formatDateForInput(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    dataPrenotazioneInput.max = formatDateForInput(tomorrow);

    populateOrarioInizio(inizioSelect);
    populateOrarioFine(inizioSelect, fineSelect);

    filtriBtnContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            // Aggiorna lo stile dei bottoni
            filtriBtnContainer.querySelector('.is-link')?.classList.remove('is-link');
            event.target.classList.add('is-link');

            // Imposta il nuovo filtro e ricarica le prenotazioni
            filtroCorrente = event.target.dataset.filtro;
            loadPrenotazioni(true); // 'true' per resettare la lista
        }
    });

    mostraDiPiuBtn.addEventListener('click', () => {
        paginaCorrente++; // Incrementa la pagina
        loadPrenotazioni(false); // 'false' per non resettare (appendere)
    });

    // Caricamento iniziale
    loadPrenotazioni(true);

    // Event Listeners
    inizioSelect.addEventListener("change", () => populateOrarioFine(inizioSelect, fineSelect));
    document.querySelector('button[onclick="prenotaAula()"]').onclick = prenotaAula;
    confermaAnnullamentoBtn.addEventListener('click', terminaPrenotazione);
    inviaRecensioneBtn.addEventListener('click', inviaRecensione);

    // Usa l'ID corretto anche qui
    setupModalClosers('modal-termina-prenotazione');
    setupModalClosers('modal-recensione');
    setupModalClosers('modal-visualizza-recensione');

    window.apriModal = apriModal;
});