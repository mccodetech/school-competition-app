// Firebase ക്രമീകരണങ്ങൾ ഇവിടെ നൽകുക (Firebase Console-ൽ നിന്ന് ലഭിക്കുന്നത്)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. അഡ്മിൻ ലോഗിൻ പരിശോധന
window.adminLogin = function() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user === "admin" && pass === "admin123") {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        loadCompetitions();
        loadStudentsDropdown();
    } else {
        alert("തെറ്റായ യൂസർനെയിമോ പാസ്‌വേർഡോ ആണ്!");
    }
}

window.adminLogout = function() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('dashboard-section').style.display = 'none';
}

// 2. എക്സൽ ഫയൽ വായിച്ച് ഫയർബേസിലേക്ക് സേവ് ചെയ്യൽ
window.uploadExcel = function() {
    const fileInput = document.getElementById('excelFile');
    if (fileInput.files.length === 0) {
        alert("ദയവായി ഒരു എക്സൽ ഫയൽ തിരഞ്ഞെടുക്കുക!");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        try {
            for (let row of rows) {
                // എക്സലിലെ കോളങ്ങൾ: Name, UID, Class എന്ന് കൃത്യമായിരിക്കണം
                await addDoc(collection(db, "students"), {
                    name: row['Name'] || '',
                    uid: row['UID'] || '',
                    class: row['Class'] || ''
                });
            }
            alert("വിദ്യാർത്ഥികളുടെ വിവരങ്ങൾ വിജയകരമായി അപ്‌ലോഡ് ചെയ്തു!");
            loadStudentsDropdown();
        } catch (error) {
            console.error("Error uploading: ", error);
            alert("അപ്‌ലോഡ് ചെയ്യുന്നതിൽ തടസ്സം നേരിട്ടു.");
        }
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

// 3. മത്സര ഇനങ്ങൾ ചേർക്കൽ
window.addCompetition = async function() {
    const compName = document.getElementById('competitionName').value;
    if (!compName) return;

    try {
        await addDoc(collection(db, "competitions"), { name: compName });
        document.getElementById('competitionName').value = '';
        loadCompetitions();
        alert("മത്സര ഇനം ചേർത്തു!");
    } catch (e) {
        console.error("Error adding competition: ", e);
    }
}

async function loadCompetitions() {
    const listEl = document.getElementById('competitionList');
    const selectEl = document.getElementById('selectCompetition');
    listEl.innerHTML = '';
    selectEl.innerHTML = '<option value="">മത്സരം തിരഞ്ഞെടുക്കുക</option>';

    const querySnapshot = await getDocs(collection(db, "competitions"));
    querySnapshot.forEach((docSnap) => {
        const comp = docSnap.data();
        listEl.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">${comp.name}</li>`;
        selectEl.innerHTML += `<option value="${docSnap.id}">${comp.name}</option>`;
    });
}

async function loadStudentsDropdown() {
    const selectStudent = document.getElementById('selectStudent');
    selectStudent.innerHTML = '<option value="">വിദ്യാർത്ഥിയെ തിരഞ്ഞെടുക്കുക</option>';

    const querySnapshot = await getDocs(collection(db, "students"));
    querySnapshot.forEach((docSnap) => {
        const student = docSnap.data();
        selectStudent.innerHTML += `<option value="${docSnap.id}">${student.uid} - ${student.name} (${student.class})</option>`;
    });
}

// 4. മത്സരത്തിലേക്ക് കുട്ടികളെ ചേർക്കൽ
window.registerParticipant = async function() {
    const compId = document.getElementById('selectCompetition').value;
    const studentId = document.getElementById('selectStudent').value;

    if (!compId || !studentId) {
        alert("മത്സരവും വിദ്യാർത്ഥിയെയും തിരഞ്ഞെടുക്കുക!");
        return;
    }

    try {
        await addDoc(collection(db, "participants"), {
            competitionId: compId,
            studentId: studentId,
            mark: 0
        });
        alert("വിദ്യാർത്ഥിയെ മത്സരത്തിലേക്ക് ചേർത്തു!");
        loadParticipants();
    } catch (e) {
        console.error("Error: ", e);
    }
}

// 5. മത്സരത്തിൽ പങ്കെടുക്കുന്നവരുടെ മാർക്ക് എന്റർ ചെയ്യൽ
window.loadParticipants = async function() {
    const compId = document.getElementById('selectCompetition').value;
    const container = document.getElementById('participantsListForMarks');
    container.innerHTML = '';

    if (!compId) return;

    // വിദ്യാർത്ഥികളുടെ വിവരങ്ങൾ മുൻകൂട്ടി എടുത്തു വെക്കാം
    const studentsSnap = await getDocs(collection(db, "students"));
    const studentsMap = {};
    studentsSnap.forEach(d => studentsMap[d.id] = d.data());

    const participantsSnap = await getDocs(collection(db, "participants"));
    
    let html = `<table class="table"><thead><tr><th>പേര്</th><th>UID</th><th>മാർക്ക്</th><th>ആക്ഷൻ</th></tr></thead><tbody>`;
    
    participantsSnap.forEach((docSnap) => {
        const p = docSnap.data();
        if (p.competitionId === compId) {
            const student = studentsMap[p.studentId] || {};
            html += `<tr>
                <td>${student.name || 'N/A'}</td>
                <td>${student.uid || 'N/A'}</td>
                <td><input type="number" id="mark_${docSnap.id}" value="${p.mark}" class="form-control" style="width: 100px;"></td>
                <td><button onclick="updateMark('${docSnap.id}')" class="btn btn-sm btn-success">സേവ് ചെയ്യുക</button></td>
            </tr>`;
        }
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

window.updateMark = async function(participantId) {
    const mark = document.getElementById(`mark_${participantId}`).value;
    try {
        const docRef = doc(db, "participants", participantId);
        await updateDoc(docRef, { mark: Number(mark) });
        alert("മാർക്ക് അപ്‌ഡേറ്റ് ചെയ്തു!");
    } catch (e) {
        console.error("Error updating mark: ", e);
    }
}
