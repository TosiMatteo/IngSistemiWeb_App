document.addEventListener("DOMContentLoaded", () => {
    const creaAnnuncioBtn = document.getElementById("creaAnnuncioBtn");
    const newAnnuncioTitolo = document.getElementById("newAnnuncioTitolo");
    const newAnnuncioContenuto = document.getElementById("newAnnuncioContenuto");
    const annunciTableBody = document.getElementById("annunciTableBody");

    // Riferimenti per la modale di modifica
    const modalModificaAnnuncio = document.getElementById("modal-modifica-annuncio");
    const editAnnuncioId = document.getElementById("editAnnuncioId");
    const editAnnuncioTitolo = document.getElementById("editAnnuncioTitolo");
    const editAnnuncioContenuto = document.getElementById("editAnnuncioContenuto");
    const editAnnuncioAttivo = document.getElementById("editAnnuncioAttivo");
    const salvaModificheBtn = document.getElementById("salvaModificheBtn");

    // CSRF Token (se common.js non lo gestisce globalmente per Axios)
    const csrfMeta = document.querySelector('meta[name="_csrf"]');
    if (csrfMeta) {
        const CSRF_TOKEN = csrfMeta.content;
        const CSRF_HEADER = document.querySelector('meta[name="_csrf_header"]').content;
        axios.defaults.headers.common[CSRF_HEADER] = CSRF_TOKEN;
    }

// --- Funzioni API ---
    async function loadAnnunciAdmin() {
        annunciTableBody.innerHTML = '<tr><td colspan="8" class="has-text-grey">Caricamento annunci...</td></tr>';
        try {
            const response = await axios.get('/api/annunci/admin/all');
            renderAnnunciTable(response.data);
        } catch (error) {
            console.error("Errore nel caricamento annunci admin:", error);
            showNotification("Errore nel caricamento degli annunci.", false);
            annunciTableBody.innerHTML = '<tr><td colspan="8" class="has-text-danger">Impossibile caricare gli annunci.</td></tr>';
        }
    }

    async function creaAnnuncio() {
        const titolo = newAnnuncioTitolo.value.trim();
        const contenuto = newAnnuncioContenuto.value.trim();

        try {
            await axios.post('/api/annunci', { titolo, contenuto });
            showNotification("Annuncio creato con successo!", true);
            newAnnuncioTitolo.value = '';
            newAnnuncioContenuto.value = '';
            loadAnnunciAdmin(); // Ricarica la tabella
        } catch (error) {
            console.error("Errore creazione annuncio:", error);
            // Mostra il messaggio di errore dal backend, se disponibile
            const errorMsg = error.response?.data?.error || "Errore durante la creazione dell'annuncio.";
            showNotification(errorMsg, false);
        }
    }

    async function aggiornaAnnuncio() {
        const id = editAnnuncioId.value;
        const titolo = editAnnuncioTitolo.value.trim();
        const contenuto = editAnnuncioContenuto.value.trim();
        const attivo = editAnnuncioAttivo.checked;

        try {
            await axios.put(`/api/annunci/${id}`, { titolo, contenuto, attivo });
            showNotification("Annuncio aggiornato con successo!", true);
            closeModal(modalModificaAnnuncio);
            loadAnnunciAdmin();
        } catch (error) {
            console.error("Errore aggiornamento annuncio:", error);
            // Mostra il messaggio di errore dal backend, se disponibile
            const errorMsg = error.response?.data?.error || "Errore durante l'aggiornamento dell'annuncio.";
            showNotification(errorMsg, false);
        }
    }

    async function toggleAnnuncioAttivo(id, currentStatus) {
        try {
            // Recupera l'annuncio specifico direttamente dal backend usando il suo ID
            const response = await axios.get(`/api/annunci/admin/${id}`);
            const annuncioToToggle = response.data; // L'annuncio è direttamente nel corpo della risposta

            if (annuncioToToggle) {
                // Inverti lo stato di attivazione
                annuncioToToggle.attivo = !currentStatus;

                // Prepara il payload per l'aggiornamento (PUT), includendo tutti i campi richiesti dal backend
                const payload = {
                    titolo: annuncioToToggle.titolo,
                    contenuto: annuncioToToggle.contenuto,
                    attivo: annuncioToToggle.attivo // Questo è il valore aggiornato
                };

                // Invia la richiesta PUT per aggiornare l'annuncio con il nuovo stato
                await axios.put(`/api/annunci/${id}`, payload);

                showNotification(`Annuncio ${annuncioToToggle.attivo ? 'attivato' : 'disattivato'} con successo!`, true);
                loadAnnunciAdmin(); // Ricarica la tabella per mostrare lo stato aggiornato
            } else {
                // Questo blocco dovrebbe essere raggiunto solo se il backend non trova l'annuncio,
                // ma la richiesta GET /admin/{id} dovrebbe già gestire l'errore 404
                showNotification("Annuncio non trovato per l'operazione di toggle.", false);
            }
        } catch (error) {
            console.error("Errore toggle attivo annuncio:", error);
            // Migliora la gestione degli errori per mostrare messaggi dal backend
            const errorMsg = error.response?.data?.error || "Errore durante l'operazione di attivazione/disattivazione.";
            showNotification(errorMsg, false);
        }
    }

    async function eliminaAnnuncio(id) {
        if (!confirm("Sei sicuro di voler eliminare questo annuncio? Questa operazione è irreversibile.")) {
            return;
        }
        try {
            await axios.delete(`/api/annunci/${id}`);
            showNotification("Annuncio eliminato con successo!", true);
            loadAnnunciAdmin();
        } catch (error) {
            console.error("Errore eliminazione annuncio:", error);
            const errorMsg = error.response?.data || "Errore durante l'eliminazione dell'annuncio.";
            showNotification(errorMsg, false);
        }
    }


    // --- Funzioni UI ---
    function renderAnnunciTable(annunci) {
        annunciTableBody.innerHTML = '';
        if (annunci.length === 0) {
            annunciTableBody.innerHTML = '<tr><td colspan="8" class="has-text-grey">Nessun annuncio trovato.</td></tr>';
            return;
        }

        annunci.forEach(annuncio => {
            const row = document.createElement("tr");
            const dataPub = new Date(annuncio.dataPubblicazione).toLocaleString('it-IT');

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

        // Aggiungi event listener ai pulsanti dopo averli renderizzati
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


    function openModificaModal(id) {
        axios.get(`/api/annunci/admin/${id}`)
            .then(response => {
                const annuncio = response.data;
                if (annuncio) {
                    editAnnuncioId.value = annuncio.id;
                    editAnnuncioTitolo.value = annuncio.titolo;
                    editAnnuncioContenuto.value = annuncio.contenuto;
                    editAnnuncioAttivo.checked = annuncio.attivo;
                    modalModificaAnnuncio.classList.add('is-active');
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

    function closeModal(modalElement) {
        modalElement.classList.remove('is-active');
    }

    // --- Event Listeners ---
    creaAnnuncioBtn.addEventListener('click', creaAnnuncio);
    salvaModificheBtn.addEventListener('click', aggiornaAnnuncio);

    // Gestione chiusura modale di modifica
    modalModificaAnnuncio.querySelectorAll('.delete, .modal-background, .chiudi-modale').forEach(el => {
        el.addEventListener('click', () => closeModal(modalModificaAnnuncio));
    });

    // Inizializzazione: Carica gli annunci all'avvio della pagina
    loadAnnunciAdmin();
});