export { process,  smooth_continuum_and_normalise}
import { createAkimaSplineInterpolator, createLoessInterpolator } from './interpolation.js'
import * as tf from '@tensorflow/tfjs';

function preprocessing(x, number_of_shifts, window_len = 8192) {
    x = tf.tensor(x);
    var y_shape = x.shape[0];
    var pad_number = 2 * window_len - y_shape % window_len;

    var shifts = [];
    var tensors = [];

    var i;
    for (i = 0; i < number_of_shifts; i++) {
        shifts[i] = (window_len / number_of_shifts) * i;
    }

    for (i = 0; i < number_of_shifts; i++) {
        tensors[i] = tf.pad(x, [[shifts[i], pad_number - shifts[i]]]);
        tensors[i] = tf.reshape(tensors[i], [-1, window_len, 1]);
    }

    x = tf.concat(tensors, 0);

    const mask = tf.notEqual(x, 0.0);

    var max_along_axis = tf.max(x, 1, true);
    var min_along_axis = tf.min(tf.where(mask, x, max_along_axis), 1, true);
    var normed_x = tf.divNoNan(tf.sub(x, min_along_axis), tf.sub(max_along_axis, min_along_axis));

    normed_x = tf.where(tf.isNaN(normed_x), 0.0, normed_x);
    normed_x = normed_x.where(mask, 0.0);

    var results = {
        normed_x: normed_x,
        shifts: shifts,
        max: max_along_axis,
        min: min_along_axis
    };
    return results;
}

function postprocessing(x, shifts, max_ax, min_ax, final_length) {
    // de-normalize
    var diff = tf.sub(max_ax, min_ax);
    var scaled = tf.mul(x, diff);
    var y = tf.add(scaled, min_ax);

    // Undo shifts and get result and result error estimate:
    var number_of_shifts = shifts.length;
    var tensors = tf.split(y, number_of_shifts);

    var y = [];
    var i;
    var temp_tensor;
    for (i = 0; i < number_of_shifts; i++) {
        temp_tensor = tf.reshape(tensors[i], [-1]);
        y[i] = temp_tensor.slice([shifts[i]], [final_length]);
    }

    y = tf.stack(y);
    // y = tf.where(tf.isNaN(y), 0.0, y);

    var result = {
        continuum_mean: tf.mean(y, 0).dataSync(),
        continuum_std: std(y).dataSync()
    };
    return result;
}

function std(tensor) {
    return tf.sqrt(tf.sub(tf.mean(tf.pow(tensor, 2), 0), tf.pow(tf.mean(tensor, 0, true), 2)));
}

function smooth_continuum_and_normalise(data, bandwidthFraction=0.005) {
    let input_length = data.wave.length;
    let parms = {
        xVals: data.wave_nn,
        yVals: data.continuum_nn,
        weights: tf.divNoNan(10, data.continuum_nn).dataSync(),
        minXDistance: 2.0,
        bandwidthFraction: bandwidthFraction,
        robustnessIters: 1,
        accuracy: 1E-6,
        outlierDistanceFactor: 3
    };
    console.log("SMOOTH")
    console.log(bandwidthFraction)
    let continuum_smoother = createLoessInterpolator(parms);
    data.continuum_smooth = new Array(input_length);
    for (let i = 0; i < input_length; i++) {
        data.continuum_smooth[i] = continuum_smoother(data.wave[i]);
    }

    data.normed_flux = tf.divNoNan(data.flux, data.continuum_smooth).dataSync();
}

function process(model, data) {

    let number_of_shifts = 8;
    // interpolate for NN
    let interpolator = createAkimaSplineInterpolator(data.wave, data.flux);
    const input_length = data.wave.length;
    const min_wave = data.wave[0];
    const max_wave = data.wave[input_length - 1];

    let new_wave = [];
    let resampled_flux = [];

    for (let w = min_wave; w <= max_wave; w += 0.05) {
        new_wave.push(w);
        resampled_flux.push(interpolator(w));
    }
    let N = resampled_flux.length;
    console.log(max_wave, min_wave, N);

    var nn_result = tf.tidy(() => { // NN

        var x = preprocessing(resampled_flux, number_of_shifts);
        var y = model.predict(x.normed_x);
        var values = postprocessing(y[1], x.shifts, x.max, x.min, N);
        return values;
    });

    // interpolate back 

    interpolator = createAkimaSplineInterpolator(new_wave, nn_result.continuum_mean);
    let interpolator_err = createAkimaSplineInterpolator(new_wave, nn_result.continuum_std);
    let resampled_result = new Array(data.wave.length);
    let resampled_error = new Array(data.wave.length);
    for (let i = 0; i < input_length; i++) {
        let y = interpolator(data.wave[i]);
        let err = interpolator_err(data.wave[i]);
        if (err > 0) {
            resampled_error[i] = err;//Math.sqrt(err);
        }
        else {
            resampled_error[i] = 0.0;
        }
        if (y <= 0) {
            resampled_result[i] = 0.0;
        }
        else {
            resampled_result[i] = y;
        }
    }
    data.wave_nn = new_wave
    data.continuum_nn = nn_result.continuum_mean
    // data.continuum_smooth = tf.zerosLike(resampled_result).dataSync();
    data.continuum = resampled_result;
    data.continuum_err = resampled_error;
    smooth_continuum_and_normalise(data);
    // const { xVals, yVals, weights, bandwidthFraction = 0.3, robustnessIters = 2, accuracy = 1E-12, outlierDistanceFactor = 6, diagInfo } = parms;
    return data;
}