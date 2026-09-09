import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggleBtn = document.getElementById('toggle-auth-btn');
    const signupFields = document.getElementById('signup-fields');

    if (isSignUpMode) {
        title.innerText = "Institution Registration (Sign Up)";
        btn.innerText = "Create Account";
        toggleBtn.innerText = "Already have an account? Login";
        signupFields.style.display = 'block';
    } else {
        title.innerText = "Institution Login";
        btn.innerText = "Login";
        toggleBtn.innerText = "Don't have an account? Sign Up";
        signupFields.style.display = 'none';
    }
}

window.handleLogin = async function() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;

    if (!email || !pass) {
        alert("Please enter email and password!");
        return;
    }

    try {
        if (isSignUpMode) {
            const name = document.getElementById('inst-name').value;
            const location = document.getElementById('inst-location').value;
            const affiliation = document.getElementById('inst-affiliation').value;

            if (!name || !location || !affiliation) {
                alert("Please fill in all institution details!");
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;

            await setDoc(doc(db, "institutes", user.uid), {
                name: name,
                location: location,
                affiliation: affiliation,
                email: email
            });

            alert("Institution account created successfully!");
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (error) {
        alert("Error: " + error.message);
    }
}

window.handleLogout = async function() {
    await signOut(auth);
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentInstituteId = user.uid;
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        await loadInstituteProfile();
        loadCompetitions();
        loadStudentsDropdown();
    } else {
        currentInstituteId = null;
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('dashboard-section').style.display = 'none';
    }
});

async function loadInstituteProfile() {
    const docRef = doc(db, "institutes", currentInstituteId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('display-name').innerText = data.name || '';
        document.getElementById('display-location').innerText = data.location || '';
        document.getElementById('display-affiliation').innerText = data.affiliation || '';
    }
}

window.openEditProfile = async function() {
    const docRef = doc(db, "institutes", currentInstituteId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('edit-name').value = data.name || '';
        document.getElementById('edit-location').value = data.location || '';
        document.getElementById('edit-affiliation').value = data.affiliation || '';
    }
    document.getElementById('edit-profile-section').style.display = 'block';
}

window.cancelEditProfile = function() {
    document.getElementById('edit-profile-section').style.display = 'none';
}

window.saveProfile = async function() {
    const name = document.getElementById('edit-name').value;
    const location = document.getElementById('edit-location').value;
    const affiliation = document.getElementById('edit-affiliation').value;

    try {
        const docRef = doc(db, "institutes", currentInstituteId);
        await updateDoc(docRef, {
            name: name,
            location: location,
            affiliation: affiliation
        });
        alert("Profile updated successfully!");
        document.getElementById('edit-profile-section').style.display = 'none';
        loadInstituteProfile();
    } catch (e) {
        alert("Error: " + e.message);
    }
}

window.uploadExcel = function() {
    const fileInput = document.getElementById('excelFile');
    if (fileInput.files.length === 0) {
        alert("Please select an Excel file!");
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
                // എക്സലിലെ കോളങ്ങൾ ഏത് കേസിൽ വന്നാലും (Name/name, UID/uid, Class/class) എടുക്കാൻ വേണ്ടി:
                const studentName = row['Name'] || row['name'] || row['NAME'] || '';
                const studentUid = row['UID'] || row['uid'] || row['Uid'] || '';
                const studentClass = row['Class'] || row['class'] || row['CLASS'] || '';

                await addDoc(collection(db, "students"), {
                    instituteId: currentInstituteId,
                    name: studentName,
                    uid: studentUid,
                    class: studentClass
                });
            }
            alert("Students uploaded successfully!");
            loadStudentsDropdown();
        } catch (error) {
            console.error("Error uploading: ", error);
            alert("Error uploading students.");
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
        alert("Competition added successfully!");
    } catch (e) {
        console.error("Error: ", e);
    }
}

async function loadCompetitions() {
    const listEl = document.getElementById('competitionList');
    const selectEl = document.getElementById('selectCompetition');
    listEl.innerHTML = '';
    selectEl.innerHTML = '<option value="">Select Competition</option>';

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
    selectStudent.innerHTML = '<option value="">Select Student</option>';

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
        alert("Please select both competition and student!");
        return;
    }

    try {
        await addDoc(collection(db, "participants"), {
            instituteId: currentInstituteId,
            competitionId: compId,
            studentId: studentId,
            mark: 0
        });
        alert("Student added to competition successfully!");
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
    
    let html = `<table class="table"><thead><tr><th>Name</th><th>UID</th><th>Mark</th><th>Action</th></tr></thead><tbody>`;
    
    participantsSnap.forEach((docSnap) => {
        const p = docSnap.data();
        if (p.competitionId === compId) {
            const student = studentsMap[p.studentId] || {};
            html += `<tr>
                <td>${student.name || 'N/A'}</td>
                <td>${student.uid || 'N/A'}</td>
                <td><input type="number" id="mark_${docSnap.id}" value="${p.mark}" class="form-control" style="width: 100px;"></td>
                <td><button onclick="updateMark('${docSnap.id}')" class="btn btn-sm btn-success">Save</button></td>
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
        alert("Mark updated successfully!");
    } catch (e) {
        console.error("Error updating mark: ", e);
    }
}
