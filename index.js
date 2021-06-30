window.data = { "raw_data_Spliting": [], //lines
                "raw_dataforTable": [],
                "wave": [], //tofile
                "flux": [], //tofile
                "normed_flux":[], //tofile
                "continuum":[], //tofile
                "continuum_err":[], //tofile
                "continuum_smooth":[], //tofile  == continuum_smooth
                "wave_nn": [],
                "continuum_nn": [],
                "separator":",",
                "spectrum_name":""
               };

import * as tf from '@tensorflow/tfjs';
import { download } from './modules/download.js';
import { getAsText, drawOutput, processDataAfterOtherSplit } from './modules/upload.js';
import { plot, doublewave, doublecontinuum_err } from './modules/plot.js';
import { process, smooth_continuum_and_normalise } from './modules/NeuralNetwork.js';
import { example_data } from './modules/examplevartable.js';


const SIGNAL_SIZE = 8192;
let model;
var es = document.forms[0].elements;

function setNullLines(){
    data.raw_data_Spliting = [];
    setNullPlotData();
}

function setNullPlotData(){
    data.raw_dataforTable = [];
    data.wave = [];
    data.flux = [];
    data.normed_flux = [];
    data.continuum = [];
    data.continuum_smooth = []; 
    data.continuum_err = [];
}

var workerNormalise = new Worker("./modules/normalise.js");
const first = document.querySelector('#number1');

const DefaultSettings =  async () => {
    setNullLines();
    catchDataForPlot(1);

    data.raw_dataforTable = example_data;
    var i;
    var N = data.raw_dataforTable.length;
    for(i = 0; i < N-1; i++){
        data.wave[i] = parseFloat(data.raw_dataforTable[i][0]);
        data.flux[i] = parseFloat(data.raw_dataforTable[i][1]);
    }

    drawOutput();

    var worker = new Worker("./modules/loadModel.js");

    await status('Busy - please wait. It may take about 2 minutes.', true);

    worker.postMessage(data,model);
    worker.onmessage = async function(e){
    data = e.data;
    model = e.model;

    
    plot(data.wave, data.flux, data.normed_flux, data.continuum, data.continuum_smooth, data.continuum_err, false);

    await status('SUPPNet has been loaded.', false);
    }
}

const loadsampledatafile = document.getElementById('loadsampledata');
loadsampledatafile.addEventListener('change', evt => {
    setNullLines();
    load_example_data();
    drawOutput();
    clearIdfile(es[0]);
    plot(data.wave, data.flux, data.normed_flux, data.continuum, data.continuum_smooth, data.continuum_err, false);
});

function clearIdfile(file){
  if(file.value){
    try{
      file.value = '';
    }catch(error){
    }
  }
}

function load_example_data(){
    data.raw_dataforTable = example_data;
    var i;
    var N = data.raw_dataforTable.length;
    for(i = 0; i < N-1; i++){
        data.wave[i] = parseFloat(data.raw_dataforTable[i][0]);
        data.flux[i] = parseFloat(data.raw_dataforTable[i][1]);
    }
}

const uploaddatafile = document.getElementById('uploaddata');
uploaddatafile.addEventListener('change', evt => {
    setNullLines();
    drawOutput();
    plot(data.wave, data.flux, data.normed_flux, data.continuum, data.continuum_smooth, data.continuum_err, false);
});

const filesElement = document.getElementById('files');
filesElement.addEventListener('change', evt => {
    setNullLines();
    let files = evt.target.files;
    data.spectrum_name = files[0].name;
    const output_filename = document.getElementById("filename")
    output_filename.value = data.spectrum_name;
    getAsText(files[0]);
});

function set_separator(separator) 
{
  return func => {if(data.raw_data_Spliting.lenght != 0){
    data.separator = separator;
    setNullPlotData();
    processDataAfterOtherSplit(data.raw_data_Spliting);}
  }
}

const sepcommafile = document.getElementById('sepcomma');
sepcommafile.addEventListener('change', set_separator(","));

const sepspacefile = document.getElementById('sepspace');
sepspacefile.addEventListener('change', set_separator(/\s+/i));

const sepsemicolonfile = document.getElementById('sepsemicolon');
sepsemicolonfile.addEventListener('change', set_separator(";"));

const normalizefileselector = document.querySelector('#normalize');
var t1;
var t2;
normalizefileselector.onclick = async function(){
    await status('Normalising - it may take about 2 minutes.',true);
    t1= performance.now();
    workerNormalise.postMessage(data,model);
}

workerNormalise.onmessage = async function(e){
    data = e.data;
    model = e.model;

    t2= performance.now();
    await status(`Normed in ${((t2-t1)/1000.).toPrecision(2)} seconds.`,false);
    slider.value = 50;
    plot(data.wave, data.flux, data.normed_flux, data.continuum, data.continuum_smooth, data.continuum_err, false);
}

const downloadElement = document.getElementById('dwn-btn');
downloadElement.addEventListener('click', async evt => {
    await status("Downloading file...",true);
    var N = data.wave.length;
    var sep = " ";
    var line = ["wave","flux","normed_flux","continuum","continuum_smooth","continuum_err","\n"].join(sep)
    var DownloadingFile = [line];

    for(var i=0; i<N; i++){
        line= [data.wave[i],
            data.flux[i],
            data.normed_flux[i],
            data.continuum[i],
            data.continuum_smooth[i],
            data.continuum_err[i]
            ];
        DownloadingFile.push(line.join(sep) + "\n");
    }
    DownloadingFile = DownloadingFile.join("");

    var filename = document.getElementById("filename").value;
    
    download(filename, DownloadingFile);
    await status("Done...",false);
});

const demoStatusElement = document.getElementById('status');
const status = async (msg, busy) => {

    if(busy == true){
        document.getElementById("image").style.filter = "grayscale(100%)";
        document.getElementById("image").style.animation ="spin 2s linear infinite";
    }
    else{
        document.getElementById("image").style.filter = "grayscale(0%)";
         document.getElementById("image").style.animation ="spin 0s linear infinite";
    }

    demoStatusElement.innerText = msg;
    console.log("STATUS: " + msg);
    await new Promise(r => setTimeout(r, 1));
}

// przeladuj
// const btnTryItBlock = document.getElementById('TryItBlock');

// const btnNormalise = document.getElementById('buttonNormalise');

// btnTryItBlock.addEventListener('click', async evt => {
//     plot(data.wave, data.flux, data.normed_flux, data.continuum, data.continuum_smooth, data.continuum_err, false);
// });
// btnNormalise.addEventListener('click', async evt => {
//     plot(data.wave, data.flux, data.normed_flux, data.continuum, data.continuum_smooth, data.continuum_err, false);
// });


const showPlot2 = document.getElementById('ResultSizeBlock');
showPlot2.addEventListener('click', async evt => {
    plot2();
});

// Funkcje pobierajace dane z internetu konwertujaca je na odpowiednie dane i właczajaca kolejna funkcje do wyswietlenia danych
const button1 = document.getElementById('chooseData1');
button1.addEventListener('click', async ent => {
    console.log("addEventListener");
    catchDataForPlot(1);
});

const button2 = document.getElementById('chooseData2');
button2.addEventListener('click', async ent => {
    console.log("addEventListener");
    catchDataForPlot(2);
});

const button3 = document.getElementById('chooseData3');
button3.addEventListener('click', async ent => {
    console.log("addEventListener");
    catchDataForPlot(3);
});

const button4 = document.getElementById('chooseData4');
button4.addEventListener('click', async ent => {
    console.log("addEventListener");
    catchDataForPlot(4);
});

const button5 = document.getElementById('chooseData5');
button5.addEventListener('click', async ent => {
    console.log("addEventListener");
    catchDataForPlot(5);
});

const button6 = document.getElementById('chooseData6');
button6.addEventListener('click', async ent => {
    console.log("addEventListener");
    catchDataForPlot(6);
});

// Funkcja pobierajaca dane z githuba
function catchDataForPlot(numerOfData){
    let url1;
    let url2;

    switch(numerOfData) {
        case 1:
            url1 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd155806_1.csv';
            url2 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd155806_2.csv';
            break;
        case 2:
            url1 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd90882_1.csv';
            url2 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd90882_2.csv';
            break;
        case 3:
            url1 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd27411_1.csv';
            url2 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd27411_2.csv';
            break;
        case 4:
            url1 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd37495_1.csv';
            url2 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd37495_2.csv';
            break;
        case 5:
            url1 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd59967_1.csv';
            url2 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd59967_2.csv';
            break;
        case 6:
            url1 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd25069_1.csv';
            url2 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd25069_2.csv';
            break;
        default:
            url1 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd155806_1.csv';
            url2 = 'https://rozanskit.com/nn_models/suppnet_plot_data/plot_hd155806_2.csv';
    }

    var myRequest1 = new Request(url1);

    fetch(myRequest1)
    .then(function(response){
        if(!response.ok){
            throw new Error("Http error, status = " + response.status)
        }
        return response.text();
    })
    .then(function(text) {
        var x0_wave = [];
        var x0_0_flux = [];

        var dataSplit = text.split('\n');

        for(let i = 1; i < dataSplit.length; i++){
            let temp = dataSplit[i].split(",");
            x0_wave.push(parseFloat(temp[0]));
            x0_0_flux.push(parseFloat(temp[1]));
        }    

        var myRequest2 = new Request(url2);

        fetch(myRequest2)
        .then(function(response){
            if(!response.ok){
                throw new Error("Http error, status = " + response.status)
            }
            return response.text();
        })
        .then(function(text) {
            var x1_wave = [];
            var x0_1_cont_active = [];
            var x0_2_cont_synth = [];
            var x0_3_cont_tr_normed = [];
            var x0_4_cont_np_normed = [];
            var x0_5_cont_en_normed = [];
            var x1_0_res_en_normed_tr_normed = [];
            var x1_1_res_np_normed_tr_normed = [];
            var x1_2_res_nns_tr_normed = [];
            var x1_3_res_nna_tr_normed = [];
            var x1_4_err_lower = [];
            var x1_5_err_upper = [];
    
            var dataSplit = text.split('\n');
    
            for(let i = 1; i < dataSplit.length; i++){
                let temp = dataSplit[i].split(",");
                x1_wave.push(parseFloat(temp[0]));
                x0_1_cont_active.push(parseFloat(temp[1]));
                x0_2_cont_synth.push(parseFloat(temp[2]));
                x0_3_cont_tr_normed.push(parseFloat(temp[3]));
                x0_4_cont_np_normed.push(parseFloat(temp[4]));
                x0_5_cont_en_normed.push(parseFloat(temp[5]));
                x1_0_res_en_normed_tr_normed.push(parseFloat(temp[6]));
                x1_1_res_np_normed_tr_normed.push(parseFloat(temp[7]));
                x1_2_res_nns_tr_normed.push(parseFloat(temp[8]));
                x1_3_res_nna_tr_normed.push(parseFloat(temp[9]));
                x1_4_err_lower.push(parseFloat(temp[10]));
                x1_5_err_upper.push(parseFloat(temp[11]));
            }    
            plot2(x0_wave, x1_wave, x0_0_flux, x0_1_cont_active, x0_2_cont_synth, x0_3_cont_tr_normed, x0_4_cont_np_normed, x0_5_cont_en_normed, x1_0_res_en_normed_tr_normed, x1_1_res_np_normed_tr_normed, x1_2_res_nns_tr_normed, x1_3_res_nna_tr_normed, x1_4_err_lower, x1_5_err_upper);
    
        })
        .catch(function(error){
            console.log(error);
        })

    })
    .catch(function(error){
        console.log(error);
    })
}

function plot2(x0_wave, x1_wave, x0_0_flux, x0_1_cont_active, x0_2_cont_synth, x0_3_cont_tr_normed, x0_4_cont_np_normed, x0_5_cont_en_normed, x1_0_res_en_normed_tr_normed, x1_1_res_np_normed_tr_normed, x1_2_res_nns_tr_normed, x1_3_res_nna_tr_normed, x1_4_err_lower, x1_5_err_upper){
    var trace1 = {
        x: x0_wave,
        y: x0_0_flux,
        mode: 'line',
        yaxis: 'y2',
        name: 'Flux',
        line: {color: '#1f77b4'},
        hoverinfo: 'none'
    };

    var trace2 = {
        x: x1_wave,
        y: x0_1_cont_active,
        mode: 'line',
        yaxis: 'y2',
        name: 'SUPPNet (active)',
        line: {color: '#ff7f0e'},
        hoverinfo: 'none'
    };

    var trace3 = {
        x: x1_wave,
        y: x0_2_cont_synth,
        mode: 'line',
        yaxis: 'y2',
        name: 'SUPPNet (synth)',
        line: {color: '#2ca02c'},
        hoverinfo: 'none'
    };

    var trace4 = {
        x: x1_wave,
        y: x0_3_cont_tr_normed,
        mode: 'line',
        yaxis: 'y2',
        name: 'TR',
        line: {color: '#d62728'},
        hoverinfo: 'none'
    };

    var trace5 = {
        x: x1_wave,
        y: x0_4_cont_np_normed,
        mode: 'line',
        yaxis: 'y2',
        name: 'NP',
        line: {color: '#9467bd'},
        hoverinfo: 'none'
    };

    var trace6 = {
        x: x1_wave,
        y: x0_5_cont_en_normed,
        mode: 'line',
        yaxis: 'y2',
        name: 'EN',
        line: {color: '#8c564b'},
        hoverinfo: 'none'
    };

    var trace7 = {
        x: x1_wave,
        y: x1_0_res_en_normed_tr_normed,
        mode: 'line',
        yaxis: 'y1',
        name: 'EN - TR',
        line: {color: '#8c564b'},
        hoverinfo: 'none'
    };

    var trace8 = {
        x: x1_wave,
        y: x1_1_res_np_normed_tr_normed,
        mode: 'line',
        yaxis: 'y1',
        name: 'NP - TR',
        line: {color: '#9467bd'},
        hoverinfo: 'none'
    };

    var trace9 = {
        x: x1_wave,
        y: x1_2_res_nns_tr_normed,
        mode: 'line',
        yaxis: 'y1',
        name: 'SUPPNet (synth) - TR',
        line: {color: '#2ca02c'},
        hoverinfo: 'none'
    };

    var trace10 = {
        x: x1_wave,
        y: x1_3_res_nna_tr_normed,
        mode: 'line',
        yaxis: 'y1',
        name: 'SUPPNet (active) - TR',
        line: {color: '#ff7f0e'},
        hoverinfo: 'none'
    };

    var trace11 = {
        x: x1_wave,
        y: x1_4_err_lower,
        mode: 'line',
        yaxis: 'y1',
        name: 'Error lower',
        line: {color: 'rgba(255,127,14,0.5)'},
        hoverinfo: 'none'
    };

    var trace12 = {
        x: x1_wave,
        y: x1_5_err_upper,
        mode: 'line',
        yaxis: 'y1',
        name: 'Error upper',
        line: {color: 'rgba(255,127,14,0.5)'},
        hoverinfo: 'none'
    };

    var data = [trace1, trace2, trace3, trace4, trace5, trace6, trace7, trace8, trace9, trace10, trace11, trace12];

    var config = { responsive: true }

    var layout = {
        yaxis: {
          domain: [0, 0.4],
        },
        yaxis2: {
          domain: [0.45, 1.0],
        },
        xaxis:{
          title: 'Wavelength [A]',
          showline: true,
          nticks: 10,
          tickfont:{
            size: 10
          },
          tickformat: '.2f',
        },
        xaxis2:{
          title: 'Normed spectrum',
          scaleratio: 2,
          position: 1,
          side: 'top',
          range: [0, 15],
          visible: true,   
          showline: true,
          showgrid: false,
          tickformat: '.2f',
        },
        };

    var style = {
        width: '100%',
        height: '100%'
    }
    Plotly.react('Plotly2', data, layout, config, style);

    // (window).resize(function () {
    //     Plotly.react('2', data, config, style);
    // });
}

// Zmiana wartości w slajderze
const slider = document.getElementById('customRange1');
slider.addEventListener('change', async evt => {
    let value = slider.value;
    console.log(value);
    smooth_continuum_and_normalise(window.data, (value/50.0)*0.005);
    plot(data.wave, data.flux, data.normed_flux, data.continuum, data.continuum_smooth, data.continuum_err, true);
    console.log("DONE!");
});

document.addEventListener("click", function(){
    window.dispatchEvent(new Event('resize'));
  });

DefaultSettings();