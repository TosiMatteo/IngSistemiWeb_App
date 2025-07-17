// admingestioneaula.js

// Gestione aula

document.addEventListener("DOMContentLoaded", () => {
    // Riferimenti agli elementi del DOM
    const aulaSelect = document.getElementById("aulaSelect");
    const aulaDetailsDiv = document.getElementById("aulaDetails");
    const btnNewAula = document.getElementById("btn-new-aula");
    const btnSaveAula = document.getElementById("btn-save-aula");
    const btnCancel = document.getElementById("btn-cancel");
    const btnDeleteAula = document.getElementById("btn-delete-aula");

    // Campi del form
    const aulaNomeInput = document.getElementById("aulaNome");
    const aulaCapienzaInput = document.getElementById("aulaCapienza");
    const aulaRisorseInput = document.getElementById("aulaRisorse");
    const orarioAperturaInput = document.getElementById("orarioApertura");
    const orarioChiusuraInput = document.getElementById("orarioChiusura");
    const aulaAttivaCheckbox = document.getElementById("aulaAttiva");
    const attivaLabel = document.getElementById("attiva-label");
    const warningModifica = document.getElementById("warning-modifica");
    const aulaImmagineFileInput = document.getElementById("aulaImmagineFile");
    const fileNameDisplay = document.getElementById("file-name-display");

    // Stato per sapere se stiamo creando o modificando
    let isCreateMode = false;

    axios.defaults.headers.common[document.querySelector('meta[name="_csrf_header"]').getAttribute('content')] = document.querySelector('meta[name="_csrf"]').getAttribute('content');

    /**
     * Abilita o disabilita i campi sensibili (capienza, orari) e aggiorna le etichette.
     * @param {boolean} disable - True per disabilitare, false per abilitare.
     */
    function setSensitiveFieldsDisabled(disable) {
        aulaCapienzaInput.disabled = disable;
        orarioAperturaInput.disabled = disable;
        orarioChiusuraInput.disabled = disable;
        warningModifica.style.display = disable ? 'block' : 'none';
    }

    /**
     * Aggiorna l'etichetta dello stato Attiva/Non Attiva
     */
    function updateAttivaLabel(isAttiva) {
        attivaLabel.textContent = isAttiva ? "Attiva" : "Non Attiva";
    }

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

        // Converto il valore stringa dell'attributo `data-attiva` in un booleano,
        // che poi viene usato per popolare la checkbox `aulaAttivaCheckbox` e per la logica di abilitazione/disabilitazione dei campi.
        const isAttiva = selectedOption.getAttribute("data-attiva") === "true";

        // Popola i campi
        aulaNomeInput.value = selectedOption.text;
        aulaCapienzaInput.value = selectedOption.getAttribute("data-capienza");
        aulaRisorseInput.value = selectedOption.getAttribute("data-risorse");
        orarioAperturaInput.value = selectedOption.getAttribute("data-orarioapertura");
        orarioChiusuraInput.value = selectedOption.getAttribute("data-orariochiusura");
        aulaAttivaCheckbox.checked = isAttiva;
        aulaImmagineFileInput.value = null;
        fileNameDisplay.textContent = "Nessun file selezionato";

        updateAttivaLabel(isAttiva); // Aggiorna l'etichetta Attiva/Non Attiva.
        setSensitiveFieldsDisabled(isAttiva); // Disabilita i campi se l'aula è attiva

        btnSaveAula.textContent = "Aggiorna Aula"; // Cambia il testo del bottone "Salva".
        btnDeleteAula.style.display = 'inline-block'; // Mostra il bottone "Elimina".
        aulaDetailsDiv.style.display = "block"; // Mostra il form dei dettagli dell'aula.
    }

    /**
     * Mostra un form vuoto per CREARE una nuova aula.
     */
    function showCreateForm() {
        isCreateMode = true;
        aulaSelect.value = ""; // Deseleziona qualsiasi aula nel dropdown.

        // Pulisci e imposta i valori di default
        ['aulaNome', 'aulaCapienza', 'aulaRisorse'].forEach(id => document.getElementById(id).value = '');
        orarioAperturaInput.value = "08:00";
        orarioChiusuraInput.value = "20:00";
        aulaAttivaCheckbox.checked = true;
        aulaImmagineFileInput.value = null;
        fileNameDisplay.textContent = "Nessun file selezionato";

        updateAttivaLabel(true);
        // In modalità creazione, i campi sono SEMPRE abilitati
        setSensitiveFieldsDisabled(false);

        btnSaveAula.textContent = "Crea Aula"; // Cambia il testo del bottone "Salva".
        btnDeleteAula.style.display = 'none'; // Nasconde il bottone "Elimina".
        aulaDetailsDiv.style.display = "block"; // Mostra il form.
    }


    /**
     * Gestisce il salvataggio (creazione o aggiornamento) dell'aula.
     */
    function saveAula() {
        if (!aulaNomeInput.value || !aulaCapienzaInput.value) {
            alert("Nome e capienza sono campi obbligatori.");
            return;
        }

        // 1. Prepara un oggetto FormData per inviare dati misti (testo + file).
        const formData = new FormData();
        formData.append("nome", aulaNomeInput.value);
        formData.append("capienza", aulaCapienzaInput.value);
        formData.append("risorse", aulaRisorseInput.value);
        formData.append("attiva", aulaAttivaCheckbox.checked);
        formData.append("orarioApertura", orarioAperturaInput.value);
        formData.append("orarioChiusura", orarioChiusuraInput.value);

        // Aggiungi il file solo se ne è stato selezionato uno nuovo
        if (aulaImmagineFileInput.files.length > 0) {
            formData.append("immagineFile", aulaImmagineFileInput.files[0]);
        }

        // 2. Determina il metodo HTTP (POST per creazione, PUT per aggiornamento) e l'URL.
        const method = isCreateMode ? 'post' : 'put';
        const url = isCreateMode ? '/api/aule' : `/api/aule/${aulaSelect.value}`;

        axios({ method, url, data: formData, headers: { 'Content-Type': 'multipart/form-data' }})
            .then(() => {
                alert(`Aula ${isCreateMode ? 'creata' : 'aggiornata'} con successo!`);
                window.location.reload(); // Ricarica la pagina per aggiornare il dropdown delle aule.
            })
            .catch(error => {
                console.error(`Errore ${isCreateMode ? 'creazione' : 'aggiornamento'} aula:`, error);
                alert(`Errore durante l'${isCreateMode ? 'creazione' : 'aggiornamento'} dell'aula.`);
            });
    }

    function deleteAula() {
        const aulaId = aulaSelect.value;
        if (!aulaId) return;

        if (confirm(`Sei sicuro di voler eliminare l'aula? Verranno eliminate anche tutte le prenotazioni associate.`)) {
            axios.delete(`/api/aule/${aulaId}`)
                .then(() => {
                    alert("Aula eliminata con successo!");
                    window.location.reload();
                })
                .catch(error => console.error("Errore eliminazione aula:", error));
        }
    }

    function cancel() {
        aulaDetailsDiv.style.display = 'none';
        isCreateMode = false;
        aulaSelect.value = ""; // Deseleziona l'aula.
    }

    // --- Event Listeners ---
    aulaSelect.addEventListener('change', showEditForm);
    btnNewAula.addEventListener('click', showCreateForm);
    btnSaveAula.addEventListener('click', saveAula);
    btnDeleteAula.addEventListener('click', deleteAula);
    btnCancel.addEventListener('click', cancel);

    // Listener per il toggle "Attiva" che abilita/disabilita i campi SOLO in modalità modifica
    aulaAttivaCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        updateAttivaLabel(isChecked);
        if (!isCreateMode) { // Applica la logica solo se stiamo modificando
            setSensitiveFieldsDisabled(isChecked);
        }
    });

    // Listener per il campo di input del file immagine, aggiorna il nome del file visualizzato.
    aulaImmagineFileInput.onchange = () => {
        fileNameDisplay.textContent = aulaImmagineFileInput.files.length > 0 ? aulaImmagineFileInput.files[0].name : "Nessun file selezionato";
    };
});
