export { splitArray, getAsText, processData, drawOutput, processDataAfterOtherSplit };

import { plot } from './plot.js';

function splitArray() {
    var i;
    var N = data.raw_dataforTable.length;
    for (i = 0; i < N - 1; i++) {
        let temp_wave = parseFloat(data.raw_dataforTable[i][0]);
        let temp_flux = parseFloat(data.raw_dataforTable[i][1]);
        if (!isFinite(temp_flux)) {
            temp_flux = 0.0;
        }
        if (isNaN(temp_wave))
            continue;
        data.wave.push(temp_wave);
        data.flux.push(temp_flux);
    }
    checkMonotonicallyIncreasing(data.wave);
}

function getAsText(fileToRead) {
    var reader = new FileReader();
    reader.onload = function () {
        var csv = event.target.result;
        data.raw_data_Spliting = csv;
        processData(csv);
        splitArray();
        plot(data.wave, data.flux, data.normed_flux, data.continuum, data.continuum_smooth, data.continuum_err, false);
    };
    reader.onerror = errorHandler;
    reader.readAsText(fileToRead);
}

function processDataAfterOtherSplit(csv) {
    processData(csv);
    splitArray();
    plot(data.wave, data.flux, data.normed_flux, data.continuum, data.continuum_smooth, data.continuum_err, false);
}

function processData(csv) {
    try{
        var allTextLines = csv.split(/\r\n|\n/);
        var N = allTextLines.length;
        var i = 0;
        for (i; i < N; i++) {
            data.raw_dataforTable.push(allTextLines[i].trim().split(data.separator));
        }
        if (data.raw_dataforTable[N - 1].length == 0) {
            data.raw_dataforTable.pop()
        }
        drawOutput();
    }catch(error){
    }
}

function errorHandler(evt) {
    if (evt.target.error.name == "NotReadableError") {
        alert("Can't read file !");
    }
}

function drawOutput() {
    document.getElementById("output").innerHTML = "";
    var table = document.createElement("TABLE");
    table.style.border = "2px black";
    table.className = "table-bordered";

    if (data.raw_dataforTable.length <= 10) {
        var i;
        for (i = 0; i < data.raw_dataforTable.length - 1; i++) {
            var row = table.insertRow(-1);
            var j;
            for (j = 0; j < data.raw_dataforTable[i].length + 1; j++) {
                var firstNameCell = row.insertCell(-1);
                if (j == 0) {
                    firstNameCell.appendChild(document.createTextNode(i + 1));
                } else {
                    firstNameCell.appendChild(document.createTextNode(data.raw_dataforTable[i][j - 1]));
                }
            }
        }
    } else {
        var i;
        for (i = 0; i < 5; i++) {
            var row = table.insertRow(-1);
            var j;
            for (j = 0; j < data.raw_dataforTable[i].length + 1; j++) {
                var firstNameCell = row.insertCell(-1);
                if (j == 0) {
                    firstNameCell.appendChild(document.createTextNode(i + 1));
                } else {
                    firstNameCell.appendChild(document.createTextNode(data.raw_dataforTable[i][j - 1]));
                }
            }
        }
        var firstNameCell = table.insertRow(-1);
        firstNameCell.appendChild(document.createTextNode("... ..."));
        var i;
        for (i = data.raw_dataforTable.length - 5; i < data.raw_dataforTable.length - 1; i++) {
            var row = table.insertRow(-1);
            var j;
            for (j = 0; j < data.raw_dataforTable[i].length + 1; j++) {
                var firstNameCell = row.insertCell(-1);
                if (j == 0) {
                    firstNameCell.appendChild(document.createTextNode(i + 1));
                } else {
                    firstNameCell.appendChild(document.createTextNode(data.raw_dataforTable[i][j - 1]));
                }
            }
        }
    }
    document.getElementById("output").appendChild(table);
}

function checkMonotonicallyIncreasing(a) {
    for (let i = 0; i < a.length; i++) {
        if (!isFinite(a[i])) {
            throw new Error("Non-finite number detected."+i+" "+a[i]);
        }
        if (i > 0 && a[i] < a[i - 1]) {
            throw new Error("Number sequence is not monotonically increasing.");
        }
    }
}