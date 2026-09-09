import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD72SGtuhb1W2-HrpfdYwYs2vHaJvyFuOI",
    authDomain: "school-fest-83254.firebaseapp.com",
    projectId: "school-fest-83254",
    storageBucket: "school-fest-83254.firebasestorage.app",
    messagingSenderId: "80618522937",
    appId: "1:80618522937:web:5faa7a6e01d05af39380e8",
    measurementId: "G-L5SEDK6KB2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentInstituteId = null;
let isSignUpMode = false;

// വിൻഡോ ഒബ്ജക്റ്റിലേക്ക് ഫങ്ഷനുകൾ കൃത്യമായി നൽകുക
window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggleBtn = document.getElementById('toggle-auth-btn');

    if (isSignUpMode) {
        title.innerText = "സ്ഥാപന രജിസ്ട്രേഷൻ (Sign Up)";
        btn.innerText = "അക്കൗണ്ട് ഉണ്ടാക്കുക";
        toggleBtn.innerText = "이미 അക്കൗണ്ട് ഉണ്ടോ? ലോഗിൻ ചെയ്യുക";
    } else {
        title.innerText = "സ്ഥാപന ലോഗിൻ";
        btn.innerText = "ലോഗിൻ ചെയ്യുക";
        toggleBtn.innerText = "അക്കൗണ്ട് ഇല്ലെങ്കിൽ പുതിയത് ഉണ്ടാക്കുക (Sign Up)";
    }
}

window.handleLogin = async function() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;

    if (!email || !pass) {
        alert("ദയവായി ഇമെയിലും പാസ്‌വേർഡും നൽകുക!");
        return;
    }

    try {
        if (isSignUpMode) {
            await createUserWithEmailAndPassword(auth, email, pass);
            alert("സ്ഥാപന അക്കൗണ്ട് വിജയകരമായി നിർമ്മിക്കപ്പെട്ടു!");
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (error) {
        alert("പിഴവ്: " + error.message);
    }
}

window.handleLogout = async function() {
    await signOut(auth);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentInstituteId = user.uid;
        document.getElementById('institution-email-display').innerText = user.email;
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        loadCompetitions();
        loadStudentsDropdown();
    } else {
        currentInstituteId = null;
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('dashboard-section').style.display = 'none';
    }
});

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
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        try {
            for (let row of rows) {
                await addDoc(collection(db, "students"), {
                    instituteId: currentInstituteId,
                    name: row['Name'] || '',
                    uid: row['UID'] || '',
                    class: row['Class'] || ''
                });
            }
            alert("വിദ്യാർത്ഥികളുടെ വിവരങ്ങൾ അപ്‌ലോഡ് ചെയ്തു!");
            loadStudentsDropdown();
        } catch (error) {
            console.error("Error: ", error);
        }
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

window.addCompetition = async function() {
    const compName = document.getElementById('competitionName').value;
    if (!compName) return;

    try {
        await addDoc(collection(db, "competitions"), {
            instituteId: currentInstituteId,
            name: compName
        });
        document.getElementById('competitionName').value = '';
        loadCompetitions();
        alert("മത്സര ഇനം ചേർത്തു!");
    } catch (e) {
        console.error("Error: ", e);
    }
}

async function loadCompetitions() {
    const listEl = document.getElementById('competitionList');
    const selectEl = document.getElementById('selectCompetition');
    listEl.innerHTML = '';
    selectEl.innerHTML = '<option value="">മത്സരം തിരഞ്ഞെടുക്കുക</option>';

    const q = query(collection(db, "competitions"), where("instituteId", "==", currentInstituteId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
        const comp = docSnap.data();
        listEl.innerHTML += `<li class="list-group-item">${comp.name}</li>`;
        selectEl.innerHTML += `<option value="${docSnap.id}">${comp.name}</option>`;
    });
}

async function loadStudentsDropdown() {
    const selectStudent = document.getElementById('selectStudent');
    selectStudent.innerHTML = '<option value="">വിദ്യാർത്ഥിയെ തിരഞ്ഞെടുക്കുക</option>';

    const q = query(collection(db, "students"), where("instituteId", "==", currentInstituteId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
        const student = docSnap.data();
        selectStudent.innerHTML += `<option value="${docSnap.id}">${student.uid} - ${student.name} (${student.class})</option>`;
    });
}

window.registerParticipant = async function() {
    const compId = document.getElementById('selectCompetition').value;
    const studentId = document.getElementById('selectStudent').value;

    if (!compId || !studentId) {
        alert("മത്സരവും വിദ്യാർത്ഥിയെയും തിരഞ്ഞെടുക്കുക!");
        return;
    }

    try {
        await addDoc(collection(db, "participants"), {
            instituteId: currentInstituteId,
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

window.loadParticipants = async function() {
    const compId = document.getElementById('selectCompetition').value;
    const container = document.getElementById('participantsListForMarks');
    container.innerHTML = '';

    if (!compId) return;

    const studentsSnap = await getDocs(query(collection(db, "students"), where("instituteId", "==", currentInstituteId)));
    const studentsMap = {};
    studentsSnap.forEach(d => studentsMap[d.id] = d.data());

    const participantsSnap = await getDocs(query(collection(db, "participants"), where("instituteId", "==", currentInstituteId)));
    
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
