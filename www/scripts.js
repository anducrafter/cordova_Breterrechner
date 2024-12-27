// Open or create the IndexedDB database
function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ProjectsDB', 1);
  
      request.onupgradeneeded = function (event) {
        const db = event.target.result;
        // Create object store for projects if not exists
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
        }
      };
  
      request.onsuccess = function (event) {
        resolve(event.target.result);
      };
  
      request.onerror = function () {
        reject('Error opening IndexedDB');
      };
    });
  }
  function addProjectToDB(project) {
    openDatabase().then((db) => {
      const transaction = db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.add(project);  // Store the add request
  
      request.onsuccess = (event) => {
        const projectId = event.target.result;  // The new project ID
        console.log('Project added to database with ID:', projectId);
        window.location.href = `add_planks.html?project=${projectId}`;  // Redirect to add planks page with project ID
      };
  
      transaction.onerror = (error) => {
        console.error('Error adding project:', error);
      };
    });
  }

  function getAllProjectsFromDB() {
    return new Promise((resolve, reject) => {
      openDatabase().then((db) => {
        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.getAll();
  
        request.onsuccess = () => {
          resolve(request.result);
        };
  
        request.onerror = (error) => {
          reject('Error fetching projects:', error);
        };
      });
    });
  }

  function deletePlankFromProject(projectId, plankIndex) {
    openDatabase().then((db) => {
        const transaction = db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        const request = store.get(projectId);

        request.onsuccess = function (event) {
            const project = event.target.result;
            if (project && project.planks.length > plankIndex) {
                // Remove the plank from the array
                project.planks.splice(plankIndex, 1);
                const updateRequest = store.put(project);

                updateRequest.onsuccess = () => {
                    console.log('Plank deleted from project');
                    displayPlankProject(projectId);  // Refresh the display
                };
            }
        };

        request.onerror = function (event) {
            console.error('Error updating project:', event);
        };
    });
}

  function updateProjectList() {
    getAllProjectsFromDB().then((projects) => {
      const projectList = document.getElementById('projectList');
      projectList.innerHTML = '';  // Clear any existing projects
  
      if (projects.length === 0) {
        projectList.innerHTML = '<li>No projects found</li>';
      } else {
        projects.forEach((project) => {
          const li = document.createElement('li');
          li.innerHTML = `<a href="add_planks.html?project=${project.id}">${project.name} ${project.date}</a>`;
          projectList.appendChild(li);
        });
      }
    }).catch((error) => {
      console.error('Failed to load projects:', error);
    });
  }

  function addPlankToProject(projectId, plank) {
    openDatabase().then((db) => {
      const transaction = db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.get(projectId);
  
      request.onsuccess = function (event) {
        const project = event.target.result;
        if (project) {
          project.planks.push(plank);
          const updateRequest = store.put(project);
  
          updateRequest.onsuccess = () => {
            console.log('Plank added to project');
            displayPlankProject(projectId)
          };
        }
      };
  
      request.onerror = function (event) {
        console.error('Error updating project:', event);
      };
    });
  }


  function displayPlankProject(projectId) {
    openDatabase().then((db) => {
        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.get(projectId);
        
        request.onsuccess = function (event) {
            const project = event.target.result;
            if (project) {
                const plankList = document.getElementById('plankList');
                plankList.innerHTML = '';
                let volume = 0;  // Initialize volume

                project.planks.slice().reverse().forEach((plank, index) => {
                    const plankIndex = project.planks.length - index - 1; // Calculate the original index
                    const li = document.createElement('li');
                    volume += plank.volume;
                    
                    li.innerHTML = `Brett ${plankIndex + 1}: lenge: ${plank.length} m, Breitte: ${plank.width} cm, Stärke: ${plank.thickness} mm 
                                    <button onclick="deletePlankFromProject(${projectId}, ${plankIndex})">Löschen</button>`;
                    plankList.appendChild(li);
                });
                const volumeLi = document.createElement('li');
                volumeLi.innerHTML = `Total Volume: ${volume} m³`;
                plankList.appendChild(volumeLi);
            }
        };
    });
}

function exportProjectToHtml(projectId) {
    openDatabase().then((db) => {
      const transaction = db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.get(projectId);
  
      request.onsuccess = function (event) {
        const project = event.target.result;
        if (project) {
          console.log(project);
          const htmlContent = createHtmlFromJson(project);
          downloadHtmlFile(`${project.name}.html`, htmlContent);
        }
      };
  
      request.onerror = function (event) {
        console.error('Error exporting project:', event);
      };
    });
  }
  
  function createHtmlFromJson(data) {
    // Angenommen, data ist ein Array von Plank-Objekten
    const planks = data.planks || [];
    const stapelMap = {};
  
    planks.forEach(plank => {
      if (!stapelMap[plank.stapel]) {
        stapelMap[plank.stapel] = [];
      }
      stapelMap[plank.stapel].push(plank);
    });
  
    // HTML-Inhalt erstellen
    let html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>${data.name || 'Projekt'}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; } /* Kleinere Schriftgröße für mehr Inhalt */
        h1 { color: #333; font-size: 20px; }
        h2 { color: #555; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; } /* Weniger Abstand zwischen den Tabellen */
        th, td { border: 1px solid #ccc; padding: 4px; text-align: left; font-size: 12px; } /* Weniger Padding und kleinere Schrift */
        th { background-color: #f4f4f4; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        tr:hover { background-color: #e0e0e0; }
        .group-header { background-color: #d0d0d0; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>${data.name || 'Projekt'}</h1>
  `;

let volumekomplet = 0;

Object.keys(stapelMap).forEach(stapel => {
    html += `<h2>Stapel ${stapel}</h2>`;
    html += `
      <table>
        <thead>
          <tr>
            <th>Stärke (mm)</th>
            <th>Länge (m)</th>
            <th>Breiten (cm)</th> <!-- Hier werden die Breiten aufgelistet -->
            <th>Holzart</th>
          </tr>
        </thead>
        <tbody>
    `;

    let totalVolume = 0;

    // Planken im aktuellen Stapel nach Stärke und Länge gruppieren
    const groupedByThicknessAndLength = {};
    stapelMap[stapel].forEach(plank => {
        const { thickness, length, width, wood } = plank;
        const key = `${thickness}-${length}`; // Einzigartiger Schlüssel für Stärke und Länge
        if (!groupedByThicknessAndLength[key]) {
            groupedByThicknessAndLength[key] = { widths: [], wood, volume: 0 };
        }
        groupedByThicknessAndLength[key].widths.push(width); // Breiten hinzufügen
        groupedByThicknessAndLength[key].volume += plank.volume; // Volumen hinzufügen
    });

    // Für jede Kombination von Stärke und Länge die Planken auflisten
    Object.keys(groupedByThicknessAndLength).forEach(key => {
        const [thickness, length] = key.split('-'); // Stärke und Länge aus dem Schlüssel extrahieren
        const group = groupedByThicknessAndLength[key];
        
        totalVolume += group.volume;

        // Zeile für die Stärke, Länge und Breiten
        html += `
          <tr>
            <td>${thickness}</td>
            <td>${parseFloat(length).toFixed(2)}</td>
            <td>[${group.widths.join(', ')}]</td> <!-- Breiten als Liste -->
            <td>${group.wood}</td>
          </tr>
        `;
    });

    volumekomplet += totalVolume;
    html += `
        </tbody>
      </table>
      <p><strong>Gesamtvolumen für Stapel ${stapel}: ${totalVolume.toFixed(3)} m³</strong></p>
    `;
});

html += `
    <p><strong>Gesamtvolumen für alle Stapel: ${volumekomplet.toFixed(3)} m³</strong></p>
`;

html += `
      </body>
      </html>
`;

return html;
  }
  function downloadHtmlFile(filename, content) {
    const blob = new Blob([content], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  document.addEventListener('DOMContentLoaded', function () {
    const projectForm = document.getElementById('projectForm');
    const plankForm = document.getElementById('plankForm');
  
    // Create project form submission
    if (projectForm) {
      projectForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const projectName = document.getElementById('projectName').value;
        const project = { 
            name: projectName,
            date: new Date().toLocaleDateString(),
            planks: [] 
            };
        addProjectToDB(project);
        //redericting is on addProjectToDB
      });
    }
  
    // Populate the project list
    if (document.getElementById('projectList')) {
      updateProjectList();
    }
  
    // Add plank form submission
    if (plankForm) {
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = parseInt(urlParams.get('project'), 10);
      displayPlankProject(projectId);
      plankForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const length = parseFloat(document.getElementById('length').value);
        const thickness = parseFloat(document.getElementById('thickness').value);
        const width = parseFloat(document.getElementById('width').value);
        const stapel = parseFloat(document.getElementById('stap').value);
        let wood = document.getElementById('wood').value;
        
        console.log(length * (thickness/1000) * (width/100), (thickness/1000),(width/100))
        const plank = { stapel, wood, length, thickness, width, volume: length * (thickness/1000) * (width/100) };
  
        console.log(plank)
        addPlankToProject(projectId, plank);
        document.getElementById('width').value = "";
        // Reload page to show new planks
      });

      document.getElementById('exportJson').addEventListener('click', function () {
        exportProjectToHtml(projectId);
      });
    }


  });