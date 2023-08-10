function AnalyzeLogFiles() {
  var numDays = document.getElementById('numDays').valueAsNumber;

  if (isNaN(numDays) || numDays < 1) {
    alert('Error: Enter a valid number of days.');
    return;
  }

  var logFileInput = document.getElementById('logFiles');

  if (logFileInput.files.length === 0) {
    alert('Error: Select at least one log file.');
    return;
  }

  var currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  var filteredFiles = Array.from(logFileInput.files);

  if (filteredFiles.length === 0) {
    alert('No log files found within the specified date range.');
    return;
  }

  var filePromises = filteredFiles.map(function(file) {
    return new Promise(function(resolve, reject) {
      var fileReader = new FileReader();
      fileReader.onload = function() {
        var logData = fileReader.result;
        if (file.name.endsWith('.xml')) {
          resolve(parseXMLLog(logData, file.name, numDays, currentDate));
        } else if (file.name.endsWith('.json')) {
          resolve(parseJSONLog(logData, file.name, numDays, currentDate));
        } else {
          reject(new Error('Unsupported file format: ' + file.name));
        }
      };
      fileReader.onerror = function() {
        reject(new Error('Error reading file: ' + file.name));
      };
      fileReader.readAsText(file);
    });
  });

  Promise.all(filePromises)
    .then(function(results) {
      var createdObjects = [];
      var deletedObjects = [];
      var modifiedObjects = [];

      results.forEach(function(result) {
        var logObjects = result.logObjects;
        createdObjects.push(...logObjects.created);
        deletedObjects.push(...logObjects.deleted);
        modifiedObjects.push(...logObjects.modified);
      });

      populateObjectTable(createdObjects, 'creationTable');
      populateObjectTable(deletedObjects, 'deletionTable');
      populateObjectTable(modifiedObjects, 'modificationTable');

      document.getElementById('createdCount').textContent = createdObjects.length;
      document.getElementById('deletedCount').textContent = deletedObjects.length;
      document.getElementById('modifiedCount').textContent = modifiedObjects.length;
    })
    .catch(function(error) {
      console.error('Error reading log files:', error);
      alert('Error reading log files: ' + error.message);
    });
}

function populateObjectTable(objects, tableId) {
  var table = document.getElementById(tableId);
  var rowCount = table.rows.length;
  for(var i = rowCount - 1; i> 0 ; i--)	//To remove data redundancy
  {
	  table.deleteRow(i);
  }
  objects.forEach(function(object) {
    var row = table.insertRow();
    var fileNameCell = row.insertCell();//inserting vlues into table
    var objectCell = row.insertCell();
    var ownerCell = row.insertCell();
    var dateCell = row.insertCell();
    var deletionCell = row.insertCell();

    fileNameCell.textContent = object.fileName; //inserting values of boject to cell/table
    objectCell.textContent = object.objectName;
    ownerCell.textContent = object.owner;
    dateCell.textContent = object.date;
    deletionCell.textContent = object.deletionDate;
  });
}

function parseXMLLog(logData, fileName, numDays, currentDate) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(logData, 'text/xml');

  var objects = Array.from(xmlDoc.getElementsByTagName('object')).map(function(obj) {
    var name = obj.getElementsByTagName('name')[0].textContent;
    var action = obj.getElementsByTagName('action')[0].textContent;
    var owner = obj.getElementsByTagName('owner')[0].textContent;
    var date, deletionDate;

    if (action === 'created') {
      date = obj.getElementsByTagName('creationDate')[0].textContent;
    } else if (action === 'modified') {
      date = obj.getElementsByTagName('modificationDate')[0].textContent;
    } else if (action === 'deleted') {
      date = obj.getElementsByTagName('creationDate')[0].textContent;
      deletionDate = obj.getElementsByTagName('deletionDate')[0].textContent;
    }

    if (isWithinNumDays(date, numDays, currentDate)) {
      return {
        fileName: fileName,
        objectName: name,
        action: action,
        owner: owner,
        date: date,
        deletionDate: deletionDate
      };
    } else {
      return null;
    }
  });

  objects = objects.filter(obj => obj !== null); // Remove null elements

  return {
    logObjects: {
      created: objects.filter(obj => obj.action === 'created'),
      modified: objects.filter(obj => obj.action === 'modified'),
      deleted: objects.filter(obj => obj.action === 'deleted')
    },
    file: fileName
  };
}

function parseJSONLog(logData, fileName, numDays, currentDate) {
  var logs = JSON.parse(logData);

  var createdObjects = logs.filter(obj => obj.action === 'created').map(function(object) {
    var date = object.date;
    if (isWithinNumDays(date, numDays, currentDate)) {
      return {
        fileName: fileName,
        objectName: object.name,
        owner: object.owner,
        date: date
      };
    } else {
      return null;
    }
  });

  var modifiedObjects = logs.filter(obj => obj.action === 'modified').map(function(object) {
    var date = object.date;
    if (isWithinNumDays(date, numDays, currentDate)) {
      return {
        fileName: fileName,
        objectName: object.name,
        owner: object.owner,
        date: date
      };
    } else {
      return null;
    }
  });

  var deletedObjects = logs.filter(obj => obj.action === 'deleted').map(function(object) {
    var date = object.date;
    var deletionDate = object.deletionDate;
    if (isWithinNumDays(date, numDays, currentDate)) {
      return {
        fileName: fileName,
        objectName: object.name,
        owner: object.owner,
        date: date,
        deletionDate: deletionDate
      };
    } else {
      return null;
    }
  });

  return {
    logObjects: {
      created: createdObjects.filter(obj => obj !== null),
      modified: modifiedObjects.filter(obj => obj !== null),
      deleted: deletedObjects.filter(obj => obj !== null)
    },
    file: fileName
  };
}


function isWithinNumDays(dateString, numDays, currentDate) {
  var date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  var timeDiff = currentDate.getTime() - date.getTime();
  var diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  return diffDays <= numDays;
}

function ResetLogFiles() {//for reseting values in table
  var logFileInput = document.getElementById('logFiles');
  if (confirm('Are you sure you want to reset the selected log files?')) {
    logFileInput.value = '';

    var creationTable = document.getElementById('creationTable');
    var deletionTable = document.getElementById('deletionTable');
    var modificationTable = document.getElementById('modificationTable');

    clearTable(creationTable);//function call
    clearTable(deletionTable);
    clearTable(modificationTable);

    document.getElementById('createdCount').textContent = '0';
    document.getElementById('deletedCount').textContent = '0';
    document.getElementById('modifiedCount').textContent = '0';

    alert('Log files reset from GUI successfully.');
  }
}

function clearTable(table) {
  while (table.rows.length > 1) {
    table.deleteRow(1);
  }
}
function isWithinNumDays(date, numDays, currentDate) {
  var fileDate = new Date(date);
  var timeDiff = currentDate.getTime() - fileDate.getTime();
  var diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  return diffDays <= numDays;
}
function SaveContentToFile() {
	
  // Get the summary content
  var summaryDiv = document.querySelector('.summary');
  var summaryContent = summaryDiv.outerHTML;
  // Get the tables content
  var tables = document.querySelectorAll('table');
  var tablesContent = '';
  tables.forEach(function (table) {
    tablesContent += table.outerHTML;
  });

  // Combine summary and tables content
  var fullContent = summaryContent + tablesContent;

  var blob = new Blob([fullContent], { type: 'text/html' });
  var url = URL.createObjectURL(blob);

  

  var downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = 'AnalyzedData';
  downloadLink.click();
}
