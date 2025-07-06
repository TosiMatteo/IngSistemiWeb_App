/**
 * /javascript/studenteprenotazione.js
 * Logica specifica per la dashboard dello studente.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. CONFIGURAZIONE PRENOTAZIONE INTERATTIVA ---
    const configStudente = {
        dataInputId: 'data-prenotazione-input',
        aulaSelectId: 'aula-prenotazione-select',
        gridId: 'disponibilita-grid-interattiva',
        summaryId: 'booking-summary',
        confirmBtnId: 'conferma-prenotazione-btn',
        apiEndpoint: '/api/studente/prenotazioni',
        maxDurationSlots: 8, // 4 ore = 8 slot da 30 min
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
    const prenotazioniTableBody = document.getElementById("prenotazioniStudenteTable");
    const filtriBtnContainer = document.getElementById('filtri-prenotazioni');
    const mostraDiPiuBtn = document.getElementById('mostra-di-piu-btn');
    const confermaAnnullamentoBtn = document.getElementById('confermaAnnullamentoStudenteBtn');
    const inviaRecensioneBtn = document.getElementById("inviaRecensioneBtn");

    let paginaCorrente = 0;
    let filtroCorrente = 'tutte';
    let isLastPage = false;
    const PRENOTAZIONI_PER_PAGINA = 8;
    let idPrenotazioneRecensione = null;

    async function loadPrenotazioni(reset = false) {
        if (reset) {
            paginaCorrente = 0;
            isLastPage = false;
        }
        if (isLastPage && !reset) return;

        try {
            const response = await axios.get('/api/studente/prenotazioni', {
                params: { stato: filtroCorrente, page: paginaCorrente, size: PRENOTAZIONI_PER_PAGINA, sort: 'inizio,desc' }
            });
            const page = response.data;
            renderPrenotazioni(page.content, reset);
            isLastPage = page.last;
            mostraDiPiuBtn.classList.toggle('is-hidden', isLastPage);
        } catch (error) {
            showNotification("Errore nel caricamento delle tue prenotazioni.", false);
        }
    }
    window.loadMiePrenotazioni = loadPrenotazioni; // Esponi la funzione

    function renderPrenotazioni(prenotazioni, reset) {
        if (reset) prenotazioniTableBody.innerHTML = '';
        if (prenotazioni.length === 0 && reset) {
            prenotazioniTableBody.innerHTML = '<tr><td colspan="7" class="has-text-grey">Nessuna prenotazione trovata.</td></tr>';
            return;
        }
        const rowsHtml = prenotazioni.map(p => {
            const adesso = new Date();
            const inizioPrenotazione = new Date(p.inizio);
            const fineFinestraCheckIn = new Date(inizioPrenotazione.getTime() + 15 * 60 * 1000);
            let statoHtml, azioniHtml = '', reviewButtonHtml = '';

            if (p.attiva) {
                if (p.checkedIn) statoHtml = '<span class="tag is-success">Check-in Effettuato</span>';
                else if (adesso > fineFinestraCheckIn) statoHtml = '<span class="tag is-danger">Mancato Check-in</span>';
                else statoHtml = '<span class="tag is-warning">Attiva</span>';

                if (!p.checkedIn && adesso < inizioPrenotazione) azioniHtml = `<button class="button is-small is-danger" onclick="apriModal('modal-termina-prenotazione', ${p.id})">Termina</button>`;
                else if (!p.checkedIn && adesso >= inizioPrenotazione && adesso <= fineFinestraCheckIn) azioniHtml = `<button class="button is-small is-primary" onclick="effettuaCheckIn(${p.id})">Check-in</button>`;
                else if (p.checkedIn) azioniHtml = `<button class="button is-small is-warning" onclick="apriModal('modal-termina-prenotazione', ${p.id})">Termina</button>`;
            } else {
                statoHtml = '<span class="tag">Terminata</span>';
                if (p.recensione) reviewButtonHtml = `<button class="button is-small is-light" onclick="openVisualizzazioneRecensione('${p.recensione.replace(/'/g, "\\'")}')">Visualizza</button>`;
                else reviewButtonHtml = `<button class="button is-small is-info" onclick="apriModalRecensione(${p.id})">Recensisci</button>`;
            }

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
        prenotazioniTableBody.innerHTML += rowsHtml;
    }

    window.effettuaCheckIn = async (prenotazioneId) => {
        try {
            await axios.post(`/api/studente/prenotazioni/${prenotazioneId}/check-in`);
            showNotification('Check-in effettuato con successo!', true);
            loadPrenotazioni(true);
        } catch (error) {
            showNotification(error.response?.data || "Errore durante il check-in.", false);
        }
    };

    async function terminaPrenotazione() {
        if (!prenotazioneDaTerminareId) return;
        try {
            await axios.post(`/api/studente/prenotazioni/${prenotazioneDaTerminareId}/termina`);
            showNotification('Prenotazione terminata con successo.', true);
            chiudiModal('modal-termina-prenotazione');
            loadPrenotazioni(true);
        } catch (error) {
            showNotification(error.response?.data || "Errore durante la terminazione.", false);
        }
    }

    window.apriModalRecensione = (id) => {
        idPrenotazioneRecensione = id;
        document.getElementById("recensioneTextarea").value = '';
        apriModal('modal-recensione');
    };

    window.openVisualizzazioneRecensione = (testo) => {
        document.getElementById("textareaVisualizzazioneRecensione").value = testo;
        apriModal('modal-visualizza-recensione');
    };

    inviaRecensioneBtn.addEventListener('click', async () => {
        const testo = document.getElementById("recensioneTextarea").value.trim();
        if (!testo) { showNotification("Inserisci un testo per la recensione.", false); return; }
        try {
            await axios.post(`/api/studente/prenotazioni/${idPrenotazioneRecensione}/recensione`, testo, { headers: { 'Content-Type': 'text/plain' } });
            showNotification("Recensione inviata con successo!", true);
            chiudiModal("modal-recensione");
            loadPrenotazioni(true);
        } catch (error) {
            showNotification(error.response?.data || "Errore nell'invio della recensione.", false);
        }
    });

    filtriBtnContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            filtriBtnContainer.querySelector('.is-link')?.classList.remove('is-link');
            event.target.classList.add('is-link');
            filtroCorrente = event.target.dataset.filtro;
            loadPrenotazioni(true);
        }
    });

    mostraDiPiuBtn.addEventListener('click', () => {
        paginaCorrente++;
        loadPrenotazioni(false);
    });

    confermaAnnullamentoBtn.addEventListener('click', terminaPrenotazione);

    setupModalClosers('modal-termina-prenotazione');
    setupModalClosers('modal-recensione');
    setupModalClosers('modal-visualizza-recensione');

    loadPrenotazioni(true);
});