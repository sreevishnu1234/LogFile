function analyzeLogFiles() {
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

  var filteredFiles = Array.from(logFileInput.files).filter(function(file) {
    var fileDate = new Date(file.lastModified);
    fileDate.setHours(0, 0, 0, 0);
    var timeDiff = currentDate.getTime() - fileDate.getTime();
    var diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    return diffDays <= numDays;
  });

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
          resolve(parseXMLLog(logData, file.name));
        } else if (file.name.endsWith('.json')) {
          resolve(parseJSONLog(logData, file.name));
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
        createdObjects.push(...result.created);
        deletedObjects.push(...result.deleted);
        modifiedObjects.push(...result.modified);
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

  objects.forEach(function(object) {
    var row = table.insertRow();
    var fileNameCell = row.insertCell();
    var objectCell = row.insertCell();
    var ownerCell = row.insertCell();
    var dateCell = row.insertCell();
    var deletionCell = row.insertCell();

    fileNameCell.textContent = object.fileName;
    objectCell.textContent = object.objectName;
    ownerCell.textContent = object.owner;
    dateCell.textContent = object.date;
    deletionCell.textContent = object.deletionDate;
  });
}

function parseXMLLog(logData, fileName) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(logData, 'text/xml');

  var createdObjects = Array.from(xmlDoc.getElementsByTagName('created')[0].getElementsByTagName('object')).map(function(obj) {
    return {
      fileName: fileName,
      objectName: obj.getElementsByTagName('name')[0].textContent,
      owner: obj.getElementsByTagName('owner')[0].textContent,
      date: obj.getElementsByTagName('creationDate')[0].textContent
    };
  }) || [];

  var deletedObjects = Array.from(xmlDoc.getElementsByTagName('deleted')[0].getElementsByTagName('object')).map(function(obj) {
    return {
      fileName: fileName,
      objectName: obj.getElementsByTagName('name')[0].textContent,
      owner: obj.getElementsByTagName('owner')[0].textContent,
      date: obj.getElementsByTagName('creationDate')[0].textContent,
      deletionDate: obj.getElementsByTagName('deletionDate')[0].textContent
    };
  }) || [];

  var modifiedObjects = Array.from(xmlDoc.getElementsByTagName('modified')[0].getElementsByTagName('object')).map(function(obj) {
    return {
      fileName: fileName,
      objectName: obj.getElementsByTagName('name')[0].textContent,
      owner: obj.getElementsByTagName('owner')[0].textContent,
      date: obj.getElementsByTagName('modificationDate')[0].textContent
    };
  }) || [];

  return {
    created: createdObjects,
    deleted: deletedObjects,
    modified: modifiedObjects
  };
}

function parseJSONLog(logData, fileName) {
  var log = JSON.parse(logData);

  var createdObjects = (log.created || []).map(function(object) {
    return {
      fileName: fileName,
      objectName: object.name,
      owner: object.owner,
      date: object.creationDate
    };
  });

  var deletedObjects = (log.deleted || []).map(function(object) {
    return {
      fileName: fileName,
      objectName: object.name,
      owner: object.owner,
      date: object.creationDate,
      deletionDate: object.deletionDate
    };
  });

  var modifiedObjects = (log.modified || []).map(function(object) {
    return {
      fileName: fileName,
      objectName: object.name,
      owner: object.owner,
      date: object.modificationDate
    };
  });

  return {
    created: createdObjects,
    deleted: deletedObjects,
    modified: modifiedObjects
  };
}

function resetLogFiles() {
  var numDays = document.getElementById('numDays').valueAsNumber;

  var logFileInput = document.getElementById('logFiles');
  var filteredFiles = Array.from(logFileInput.files).filter(function(file) {
    var fileDate = new Date(file.lastModified);
    fileDate.setHours(0, 0, 0, 0);
    var currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    var timeDiff = currentDate.getTime() - fileDate.getTime();
    var diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    return diffDays <= numDays;
  });

  if (filteredFiles.length === 0) {
    alert('No log files found within the specified date range.');
    return;
  }

  if (confirm('Are you sure you want to reset the selected log files?')) {
    logFileInput.value = '';

    var creationTable = document.getElementById('creationTable');
    var deletionTable = document.getElementById('deletionTable');
    var modificationTable = document.getElementById('modificationTable');

    clearTable(creationTable);
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
