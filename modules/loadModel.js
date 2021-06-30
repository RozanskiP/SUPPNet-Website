import * as tf from '@tensorflow/tfjs';
import { process } from './NeuralNetwork.js';
import { example_data } from './examplevartable.js';
const SUPPNET_WEB_PATH = "https://rozanskit.com/nn_models/suppnet_tfjs/model.json";
const SIGNAL_SIZE = 8192;

export { download }

onmessage = async function(event) {
    var model = event.model;
    var data = event.data;

    model = await download();

    // var warmupResult = model.predict(tf.zeros([8, SIGNAL_SIZE, 1]));
    // warmupResult[0].dataSync();
    // warmupResult[0].dispose();

    data = await process(model, data);

    postMessage(data,model);
}

async function download(){
    const model = await tf.loadGraphModel(SUPPNET_WEB_PATH);
    return model;
}