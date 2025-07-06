/**
 * /javascript/commonProfStudente.js
 * Libreria condivisa per le funzionalità comuni.
 * Contiene funzioni di utilità e il nuovo componente di prenotazione interattivo.
 */

// --- STATO GLOBALE COMUNE ---
let prenotazioneDaTerminareId = null;

// Impostazione del token CSRF per tutte le richieste Axios
const csrfMeta = document.querySelector('meta[name="_csrf"]');
if (csrfMeta) {
    axios.defaults.headers.common[document.querySelector('meta[name="_csrf_header"]').content] = csrfMeta.content;
}


// --- FUNZIONI DI UTILITÀ ---
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

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Converte un oggetto Date in una stringa standard ISO 8601 in formato UTC.
 * Esempio: "2025-07-04T14:30:00.000Z"
 * @param {Date} dateObject L'oggetto Date da convertire.
 * @returns {string} La stringa in formato ISO.
 */
function formatDateTimeForAPI(dateObject) {
    return dateObject.toISOString();
}


// --- FUNZIONI PER MODALI (USATE DALLA LISTA "LE MIE PRENOTAZIONI") ---
function apriModal(modalId, id = null) {
    const modal = document.getElementById(modalId);
    if(modalId === 'modal-termina-prenotazione') {
        prenotazioneDaTerminareId = id;
    }
    if (modal) modal.classList.add('is-active');
}

function chiudiModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('is-active');
    if(modalId === 'modal-termina-prenotazione') {
        prenotazioneDaTerminareId = null;
    }
}

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
 * @param {object} config - Oggetto di configurazione specifico per la pagina.
 */
function inizializzaBookingInterattivo(config) {
    const dataInput = document.getElementById(config.dataInputId);
    const aulaSelect = document.getElementById(config.aulaSelectId);
    const disponibilitaGrid = document.getElementById(config.gridId);
    const bookingSummary = document.getElementById(config.summaryId);
    const confermaBtn = document.getElementById(config.confirmBtnId);
    const resetBtn = document.getElementById('reset-selection-btn');

    let selezioneInizioIndex = null;
    let selezioneFineTime = null;
    let allSlots = [];

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
            allSlots = response.data;
            renderDisponibilita(allSlots);
        } catch (error) {
            showNotification('Errore nel caricamento della disponibilità.', false);
        }
    }

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

            box.className = `box p-2 has-text-centered dispo-tile ${available ? 'has-background-success-light is-clickable' : 'has-background-danger-light has-text-grey-light'}`;

            box.dataset.index = index;
            box.innerHTML = `<p class="time has-text-weight-semibold">${inizioTime} – ${fineTime}</p><p class="count is-size-7">${available ? `<span>${slot.liberi} posti</span>` : `<span>Pieno</span>`}</p>`;
            if (available) {
                box.addEventListener('click', handleSlotClick);
            }
            col.appendChild(box);
            disponibilitaGrid.appendChild(col);
        });
    }

    function handleSlotClick(event) {
        const clickedBox = event.currentTarget;
        const clickedIndex = parseInt(clickedBox.dataset.index, 10);

        if (selezioneInizioIndex === null || clickedIndex < selezioneInizioIndex) {
            selezioneInizioIndex = clickedIndex;
            updateSelezioneUI();
        } else {
            const fineProvvisoria = clickedIndex;
            let isValidRange = true;
            for (let i = selezioneInizioIndex; i <= fineProvvisoria; i++) {
                if (!allSlots[i] || allSlots[i].liberi === 0) {
                    isValidRange = false;
                    break;
                }
            }
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

    function updateSelezioneUI(fineIndex = null) {
        const fineReale = fineIndex === null ? selezioneInizioIndex : fineIndex;

        // 1. Pulisci tutti gli stili precedenti
        disponibilitaGrid.querySelectorAll('.dispo-tile').forEach(box => {
            box.classList.remove('has-background-link', 'has-text-white', 'has-text-info-dark'); // Rimuovi anche la nuova classe
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
                disponibilitaGrid.querySelector(`[data-index='${i}']`)?.classList.add('has-text-info-dark');
            }
        }

        // 4. Aggiorna il riepilogo e mostra i pulsanti (invariato)
        const startSlot = allSlots[selezioneInizioIndex];
        const endSlot = allSlots[fineReale];
        selezioneFineTime = endSlot.fine;
        document.getElementById('summary-aula').textContent = aulaSelect.options[aulaSelect.selectedIndex].text;
        document.getElementById('summary-data').textContent = new Date(dataInput.value + 'T00:00:00').toLocaleDateString('it-IT');
        document.getElementById('summary-orario').textContent = `${new Date(startSlot.inizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(endSlot.fine).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        bookingSummary.style.display = 'block';
        resetBtn.style.display = 'inline-block';
    }

    function resetSelezione() {
        selezioneInizioIndex = null;
        selezioneFineTime = null;
        bookingSummary.style.display = 'none';
        resetBtn.style.display = 'none';

        disponibilitaGrid.querySelectorAll('.dispo-tile').forEach(box => {
            box.classList.remove('has-background-link', 'has-text-white', 'has-text-info-dark');
        });
    }

    // Nuova versione
    async function prenota() {
        if (!dataInput.value || !aulaSelect.value || selezioneInizioIndex === null || !selezioneFineTime) {
            showNotification("Selezione non valida. Completa tutti i passaggi.", false);
            return;
        }

        // Ora lavoriamo direttamente con gli oggetti Date
        const inizioDate = new Date(allSlots[selezioneInizioIndex].inizio);
        const fineDate = new Date(selezioneFineTime);

        const prenotazioneData = {
            aulaId: aulaSelect.value,
            inizio: formatDateTimeForAPI(inizioDate), // <-- Chiamata corretta
            fine: formatDateTimeForAPI(fineDate)      // <-- Chiamata corretta
        };

        try {
            const response = await axios.post(config.apiEndpoint, prenotazioneData);
            showNotification(response.data, true);
            resetSelezione();
            loadDisponibilita();
            if (typeof window.loadMiePrenotazioni === 'function') {
                window.loadMiePrenotazioni(true);
            }
        } catch (error) {
            showNotification(error.response?.data || "Errore durante la prenotazione.", false);
        }
    }

    config.setupDatePicker(dataInput);
    dataInput.addEventListener('change', loadDisponibilita);
    aulaSelect.addEventListener('change', loadDisponibilita);
    confermaBtn.addEventListener('click', prenota);
    resetBtn.addEventListener('click', resetSelezione);

    if (aulaSelect.value) {
        loadDisponibilita();
    }
}