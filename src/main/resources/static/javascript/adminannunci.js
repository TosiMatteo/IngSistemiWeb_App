// Esegue il codice solo dopo che il DOM è stato completamente caricato.
document.addEventListener("DOMContentLoaded", () => {
    // --- Riferimenti agli elementi del DOM per la creazione di annunci ---
    const creaAnnuncioBtn = document.getElementById("creaAnnuncioBtn"); // Bottone per creare un nuovo annuncio.
    const newAnnuncioTitolo = document.getElementById("newAnnuncioTitolo"); // Campo input per il titolo del nuovo annuncio.
    const newAnnuncioContenuto = document.getElementById("newAnnuncioContenuto"); // Campo input per il contenuto del nuovo annuncio.
    const annunciTableBody = document.getElementById("annunciTableBody"); // Il corpo della tabella dove verranno listati gli annunci.

    // --- Riferimenti agli elementi del DOM per la modale di modifica ---
    const modalModificaAnnuncio = document.getElementById("modal-modifica-annuncio"); // La modale di dialogo per modificare un annuncio.
    const editAnnuncioId = document.getElementById("editAnnuncioId"); // Campo nascosto per l'ID dell'annuncio in modifica.
    const editAnnuncioTitolo = document.getElementById("editAnnuncioTitolo"); // Campo per il titolo nella modale di modifica.
    const editAnnuncioContenuto = document.getElementById("editAnnuncioContenuto"); // Campo per il contenuto nella modale di modifica.
    const editAnnuncioAttivo = document.getElementById("editAnnuncioAttivo"); // Checkbox per lo stato attivo/inattivo nella modale di modifica.
    const salvaModificheBtn = document.getElementById("salvaModificheBtn"); // Bottone per salvare le modifiche nell'annuncio.

    // --- CSRF Token Setup per Axios ---
    // Recupera e imposta il token CSRF per tutte le richieste Axios, essenziale per la sicurezza.
    const csrfMeta = document.querySelector('meta[name="_csrf"]');
    if (csrfMeta) {
        const CSRF_TOKEN = csrfMeta.content;
        const CSRF_HEADER = document.querySelector('meta[name="_csrf_header"]').content;
        axios.defaults.headers.common[CSRF_HEADER] = CSRF_TOKEN;
    }

// --- Funzioni API (Interazione con il Backend) ---

    /**
     * Carica tutti gli annunci dal backend per l'amministrazione e li visualizza nella tabella.
     */
    async function loadAnnunciAdmin() {
        annunciTableBody.innerHTML = '<tr><td colspan="8" class="has-text-grey">Caricamento annunci...</td></tr>';
        try {
            const response = await axios.get('/api/annunci/admin/all'); // Richiesta GET per tutti gli annunci.
            renderAnnunciTable(response.data); // Renderizza gli annunci nella tabella.
        } catch (error) {
            console.error("Errore nel caricamento annunci admin:", error);
            showNotification("Errore nel caricamento degli annunci.", false); // Mostra notifica di errore.
            annunciTableBody.innerHTML = '<tr><td colspan="8" class="has-text-danger">Impossibile caricare gli annunci.</td></tr>';
        }
    }

    /**
     * Invia una richiesta al backend per creare un nuovo annuncio con titolo e contenuto forniti.
     */
    async function creaAnnuncio() {
        const titolo = newAnnuncioTitolo.value.trim();
        const contenuto = newAnnuncioContenuto.value.trim();

        try {
            await axios.post('/api/annunci', { titolo, contenuto }); // Richiesta POST per creare l'annuncio.
            showNotification("Annuncio creato con successo!", true); // Notifica di successo.
            // Pulisce i campi dopo la creazione.
            newAnnuncioTitolo.value = '';
            newAnnuncioContenuto.value = '';
            loadAnnunciAdmin(); // Ricarica la tabella per mostrare il nuovo annuncio.
        } catch (error) {
            console.error("Errore creazione annuncio:", error);
            // Mostra un messaggio di errore all'utente, prioritizzando quello dal backend.
            const errorMsg = error.response?.data?.error || "Errore durante la creazione dell'annuncio.";
            showNotification(errorMsg, false);
        }
    }

    /**
     * Invia una richiesta al backend per aggiornare un annuncio esistente.
     */
    async function aggiornaAnnuncio() {
        const id = editAnnuncioId.value;
        const titolo = editAnnuncioTitolo.value.trim();
        const contenuto = editAnnuncioContenuto.value.trim();
        const attivo = editAnnuncioAttivo.checked; // Recupera lo stato della checkbox.

        try {
            await axios.put(`/api/annunci/${id}`, { titolo, contenuto, attivo }); // Richiesta PUT per aggiornare l'annuncio.
            showNotification("Annuncio aggiornato con successo!", true);
            closeModal(modalModificaAnnuncio); // Chiude la modale.
            loadAnnunciAdmin(); // Ricarica la tabella.
        } catch (error) {
            console.error("Errore aggiornamento annuncio:", error);
            const errorMsg = error.response?.data?.error || "Errore durante l'aggiornamento dell'annuncio.";
            showNotification(errorMsg, false);
        }
    }

    /**
     * Inverte lo stato attivo/inattivo di un annuncio.
     * @param {string} id - L'ID dell'annuncio.
     * @param {boolean} currentStatus - Lo stato attivo attuale dell'annuncio prima del toggle.
     */
    async function toggleAnnuncioAttivo(id, currentStatus) {
        try {
            // Recupera l'annuncio completo dal backend per assicurarsi di avere tutti i dati.
            const response = await axios.get(`/api/annunci/admin/${id}`);
            const annuncioToToggle = response.data;

            if (annuncioToToggle) {
                annuncioToToggle.attivo = !currentStatus; // Inverte lo stato.

                // Prepara il payload con lo stato aggiornato.
                const payload = {
                    titolo: annuncioToToggle.titolo,
                    contenuto: annuncioToToggle.contenuto,
                    attivo: annuncioToToggle.attivo
                };

                // Invia la richiesta PUT per aggiornare l'annuncio con il nuovo stato.
                await axios.put(`/api/annunci/${id}`, payload);

                showNotification(`Annuncio ${annuncioToToggle.attivo ? 'attivato' : 'disattivato'} con successo!`, true);
                loadAnnunciAdmin(); // Ricarica la tabella.
            } else {
                showNotification("Annuncio non trovato per l'operazione di toggle.", false);
            }
        } catch (error) {
            console.error("Errore toggle attivo annuncio:", error);
            const errorMsg = error.response?.data?.error || "Errore durante l'operazione di attivazione/disattivazione.";
            showNotification(errorMsg, false);
        }
    }

    /**
     * Elimina un annuncio specifico dopo una richiesta di conferma.
     * @param {string} id - L'ID dell'annuncio da eliminare.
     */
    async function eliminaAnnuncio(id) {
        if (!confirm("Sei sicuro di voler eliminare questo annuncio? Questa operazione è irreversibile.")) {
            return;
        }
        try {
            await axios.delete(`/api/annunci/${id}`); // Richiesta DELETE per eliminare l'annuncio.
            showNotification("Annuncio eliminato con successo!", true);
            loadAnnunciAdmin(); // Ricarica la tabella.
        } catch (error) {
            console.error("Errore eliminazione annuncio:", error);
            const errorMsg = error.response?.data || "Errore durante l'eliminazione dell'annuncio.";
            showNotification(errorMsg, false);
        }
    }

    // --- Funzioni UI (Gestione dell'Interfaccia Utente) ---

    /**
     * Renderizza (disegna) la tabella degli annunci con i dati forniti.
     * @param {Array} annunci - Un array di oggetti annuncio da visualizzare.
     */
    function renderAnnunciTable(annunci) {
        annunciTableBody.innerHTML = ''; // Pulisce il contenuto della tabella.
        if (annunci.length === 0) {
            annunciTableBody.innerHTML = '<tr><td colspan="8" class="has-text-grey">Nessun annuncio trovato.</td></tr>';
            return;
        }

        annunci.forEach(annuncio => {
            const row = document.createElement("tr");
            const dataPub = new Date(annuncio.dataPubblicazione).toLocaleString('it-IT'); // Formatta la data.

            // Costruisce la riga della tabella con i dati dell'annuncio e i pulsanti di azione.
            row.innerHTML = `
                <td>${annuncio.id}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${annuncio.titolo}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${annuncio.contenuto}</td>
                <td>${dataPub}</td>
                <td><span class="tag ${annuncio.attivo ? 'is-success' : 'is-danger'} is-light">${annuncio.attivo ? 'Sì' : 'No'}</span></td>
                <td>${annuncio.amministratore.nome} ${annuncio.amministratore.cognome}</td>
                <td>
                    <button class="button is-small is-info edit-btn" data-id="${annuncio.id}">Modifica</button>
                    <button class="button is-small ${annuncio.attivo ? 'is-warning' : 'is-success'} toggle-attivo-btn" data-id="${annuncio.id}" data-status="${annuncio.attivo}">
                        ${annuncio.attivo ? 'Disattiva' : 'Attiva'}
                    </button>
                    <button class="button is-small is-danger delete-btn" data-id="${annuncio.id}">Elimina</button>
                </td>
            `;
            annunciTableBody.appendChild(row);
        });

        // Aggiunge gli event listener ai pulsanti "Modifica", "Attiva/Disattiva" ed "Elimina"
        // dopo che le righe della tabella sono state aggiunte al DOM.
        annunciTableBody.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (event) => openModificaModal(event.target.dataset.id));
        });
        annunciTableBody.querySelectorAll('.toggle-attivo-btn').forEach(button => {
            button.addEventListener('click', (event) => toggleAnnuncioAttivo(event.target.dataset.id, event.target.dataset.status === 'true'));
        });
        annunciTableBody.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (event) => eliminaAnnuncio(event.target.dataset.id));
        });
    }

    /**
     * Apre la modale di modifica e popola i suoi campi con i dati dell'annuncio selezionato.
     * @param {string} id - L'ID dell'annuncio da modificare.
     */
    function openModificaModal(id) {
        axios.get(`/api/annunci/admin/${id}`) // Recupera i dettagli dell'annuncio dal backend.
            .then(response => {
                const annuncio = response.data;
                if (annuncio) {
                    // Popola i campi della modale con i dati dell'annuncio.
                    editAnnuncioId.value = annuncio.id;
                    editAnnuncioTitolo.value = annuncio.titolo;
                    editAnnuncioContenuto.value = annuncio.contenuto;
                    editAnnuncioAttivo.checked = annuncio.attivo;
                    modalModificaAnnuncio.classList.add('is-active'); // Mostra la modale.
                } else {
                    showNotification("Annuncio non trovato per la modifica.", false);
                }
            })
            .catch(error => {
                console.error("Errore recupero annuncio per modifica:", error);
                const errorMsg = error.response?.data?.error || "Errore nel recupero dell'annuncio per la modifica.";
                showNotification(errorMsg, false);
            });
    }

    /**
     * Chiude una modale specifica rimuovendo la classe 'is-active'.
     * @param {HTMLElement} modalElement - L'elemento DOM della modale da chiudere.
     */
    function closeModal(modalElement) {
        modalElement.classList.remove('is-active');
    }

    // --- Event Listeners (Associazioni eventi-funzioni) ---
    creaAnnuncioBtn.addEventListener('click', creaAnnuncio); // Al click del bottone "Crea Annuncio", chiama creaAnnuncio.
    salvaModificheBtn.addEventListener('click', aggiornaAnnuncio); // Al click del bottone "Salva Modifiche", chiama aggiornaAnnuncio.

    // Gestisce la chiusura della modale di modifica cliccando sullo sfondo, sul pulsante 'x' o sul pulsante "Chiudi".
    modalModificaAnnuncio.querySelectorAll('.delete, .modal-background, .chiudi-modale').forEach(el => {
        el.addEventListener('click', () => closeModal(modalModificaAnnuncio));
    });

    // --- Inizializzazione ---
    // Carica tutti gli annunci amministrativi non appena la pagina è pronta.
    loadAnnunciAdmin();
});