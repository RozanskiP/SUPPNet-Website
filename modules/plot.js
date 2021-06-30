import { localResponseNormalization } from "@tensorflow/tfjs";

export { plot, doublewave, doublecontinuum_err };

const rand = () => Math.random();

function doublewave(wave){

  var temp = Array.from(wave);
  let N = wave.length;
  let i;
  let j;
  
  for(i = N, j=N-1; i < N*2; i++, j--){
    temp[i] = wave[j];
  }
  return temp;
}

function doublecontinuum_err(continuum_err, continuum){
  
  var temp = continuum_err;
  let N = continuum_err.length;
  let i;
  let j;

  for(i = N, j=N-1; i < N*2; i++, j--){
    temp[i] = -continuum_err[j];
  }

  for(i = 0; i < N; i++){
    temp[i] += continuum[i];
  }

  for(i = N, j=N-1; i < N*2; i++, j--){
    temp[i] += continuum[j];
  }
  return temp;
}


function plot(wave, flux, normed_flux, continuum, continuum_smooth, continuum_err, zooming=false){
    var trace1 = {
        x: wave,
        y: flux,
        mode: 'line',
        yaxis: 'y2',
        name: 'Flux',
        hoverinfo: 'none'
    };

    var trace2 = {
        x: wave,
        y: continuum,
        mode: 'line',
        yaxis: 'y2',
        name: 'Continuum',
        hoverinfo: 'none'
    };

    var trace3 = {
        x: wave,
        y: continuum_smooth,
        mode: 'line',
        yaxis: 'y2',
        name: 'Smoothed continuum' ,
        hoverinfo: 'none'
    };

    var trace4 = {
        x: wave,
        y: normed_flux,
        mode: 'line',
        yaxis: 'y1',
        name: 'Normed flux',
        hoverinfo: 'none'
    };

    var dblbWave = JSON.parse(JSON.stringify(wave));
    var dblcont_err = JSON.parse(JSON.stringify(continuum_err));
    var dblcont = JSON.parse(JSON.stringify(continuum));

    var trace5 = {
      x: doublewave(dblbWave),
      y: doublecontinuum_err(dblcont_err, dblcont),
      fill: "toself", 
      fillcolor: "rgba(255,127,14,0.5)", 
      line: {color: "transparent"},
      name: 'Continuum error',
      yaxis: 'y2',
      type: "scatter",
    };

    var layout = {
      uirevision: 'true',
      yaxis: {
        domain: [0, 0.4],
        title: 'Flux',
        autorange: true
      },
      yaxis2: {
        domain: [0.45, 1.0],
        title: 'Normed flux',
        autorange: true
      },
      xaxis:{
        title: 'Wavelength [A]',
        showline: true,
        nticks: 10,
        tickfont:{
          size: 10
        },
        tickformat: '.2f',
        autorange: true
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
        autorange: true
      },
    };

    var config =  {
        responsive: true
    }

    var style={ width: '100%', height: '100%'}

    var data = [trace1, trace2, trace3, trace4, trace5];

    layout.yaxis.autorange = true;
    layout.yaxis2.autorange = true;
    layout.xaxis.autorange = true;
    layout.xaxis2.autorange = true;
    // if(!zooming){
    //   layout.uirevision = rand();
    // }
    layout.uirevision = flux;
    // console.log("UI revision - " + layout.uirevision)
    Plotly.react('myPlot', data, layout, config, style);
  }